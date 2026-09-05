import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentItem } from './entities/payment-item.entity';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

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
    private config: ConfigService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.config.getOrThrow<string>('RAZORPAY_KEY_ID'),
      key_secret: this.config.getOrThrow<string>('RAZORPAY_KEY_SECRET'),
    });
  }

  /**
   * Creates ONE combined order covering however many line items are
   * passed in — a single course, or an entire cart. The calling module
   * doesn't need to know this supports multiple items; it just passes a list.
   */
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
   * its items loaded — so the calling module can process every line
   * item (e.g. create one Enrollment per course in the order).
   */
  async verifyAndConfirm(userId: string, dto: VerifyPaymentDto): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { providerOrderId: dto.razorpayOrderId, userId },
      relations: { items: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

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
}