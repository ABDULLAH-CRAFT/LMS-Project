import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentItem } from './entities/payment-item.entity';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CartService } from 'src/cart/cart.service';
import { PaymentsGateway } from './payments.gateway';
import { PaymentSettlementService } from './payment-settlement.service';

export interface PaymentLineItem {
  referenceType: string;
  referenceId: string;
  amount: number;
  quantity?: number;
}

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay;

  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentItem) private paymentItemRepo: Repository<PaymentItem>,
    private cartService: CartService,
    private config: ConfigService,
    private paymentsGateway: PaymentsGateway,
    private settlement: PaymentSettlementService, // NEW (R2)
  ) {
    this.razorpay = new Razorpay({
      key_id: this.config.getOrThrow<string>('RAZORPAY_KEY_ID'),
      key_secret: this.config.getOrThrow<string>('RAZORPAY_KEY_SECRET'),
    });
  }

  /** Used by the webhook handler to look up which Payment a captured event belongs to. */
  async findByProviderOrderId(providerOrderId: string): Promise<Payment | null> {
    return this.paymentRepo.findOne({
      where: { providerOrderId },
      relations: { items: true },
    });
  }

  /** Verifies a Razorpay webhook's signature against the raw request body. */
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.config.getOrThrow<string>('RAZORPAY_WEBHOOK_SECRET'))
      .update(rawBody)
      .digest('hex');
    return expected === signatureHeader;
  }

  /** Idempotent: if this order is already marked PAID (e.g. the client's own
   *  /verify call already ran, or the webhook fired twice), this is a no-op
   *  that just returns the existing record instead of re-processing it. */
  async markPaidFromWebhook(providerOrderId: string, providerPaymentId: string): Promise<Payment | null> {
    const payment = await this.findByProviderOrderId(providerOrderId);
    if (!payment) return null;
    if (payment.status === PaymentStatus.PAID) return payment;

    payment.status = PaymentStatus.PAID;
    payment.providerPaymentId = providerPaymentId;
    return this.paymentRepo.save(payment);
  }

  async createOrderForItems(userId: string, lineItems: PaymentLineItem[], currency: string) {
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount * (item.quantity ?? 1), 0);

    const razorpayOrder = await this.razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // Razorpay expects paise, not rupees
      currency,
      receipt: `order_${userId}_${Date.now()}`,
    });

    const payment = this.paymentRepo.create({
      userId,
      amount: totalAmount,
      currency,
      status: PaymentStatus.CREATED,
      provider: 'razorpay',
      providerOrderId: razorpayOrder.id,
      items: lineItems.map((item) =>
        this.paymentItemRepo.create({
          referenceType: item.referenceType,
          referenceId: item.referenceId,
          amount: item.amount,
          quantity: item.quantity ?? 1,
        }),
      ),
    });
    await this.paymentRepo.save(payment);

    return {
      payment,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: this.config.getOrThrow<string>('RAZORPAY_KEY_ID'),
    };
  }

  /**
   * Verifies a completed Razorpay payment and returns the Payment WITH
   * its items loaded.
   */
  async verifyAndConfirm(userId: string, dto: VerifyPaymentDto): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { providerOrderId: dto.razorpayOrderId, userId },
      relations: { items: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    // R2: a payment that is already PAID (and possibly already turned into revenue)
    // must never be downgraded by a repeated or forged /verify call.
    if (payment.status === PaymentStatus.PAID) return payment;

    const expectedSignature = crypto
      .createHmac('sha256', this.config.getOrThrow<string>('RAZORPAY_KEY_SECRET'))
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
      throw new BadRequestException('Payment signature verification failed');
    }

    payment.status = PaymentStatus.PAID;
    payment.providerPaymentId = dto.razorpayPaymentId;
    return this.paymentRepo.save(payment);
  }

  /**
   * Mobile redirect path: verifies the signature and finalizes the order right
   * here on the server, before control passes back to the app.
   *
   * R2: revenue allocation + enrollment now happen in ONE transaction via
   * PaymentSettlementService. Idempotent with /verify and the webhook.
   */
  async confirmOrderAndEnroll(dto: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<void> {
    const payment = await this.findByProviderOrderId(dto.razorpayOrderId);
    if (!payment) return;

    if (payment.status !== PaymentStatus.PAID) {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.getOrThrow<string>('RAZORPAY_KEY_SECRET'))
        .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
        .digest('hex');

      if (expectedSignature !== dto.razorpaySignature) {
        payment.status = PaymentStatus.FAILED;
        await this.paymentRepo.save(payment);
        return;
      }

      payment.status = PaymentStatus.PAID;
      payment.providerPaymentId = dto.razorpayPaymentId;
      await this.paymentRepo.save(payment);
    }

    const result = await this.settlement.settle(payment.id);

    await this.cartService.removeItems(payment.userId, result.courseIds);

    this.paymentsGateway.notifyPaymentSuccess(payment.userId, {
      orderId: payment.providerOrderId,
      paymentId: dto.razorpayPaymentId,
      enrolledCourseIds: result.courseIds,
    });
  }
}
