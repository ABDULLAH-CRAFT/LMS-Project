import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaymentsService } from '../payment/payments.service';
import { PaymentSettlementService } from '../payment/payment-settlement.service';
import { PaymentsGateway } from '../payment/payments.gateway';
import { PaymentStatus } from '../payment/entities/payment.entity';
import { VerifyPaymentDto } from '../payment/dto/verify-payment.dto';
import { MembershipPlan } from './entities/membership-plan.entity';
import { Subscription } from './entities/subscription.entity';
import {
  ACCESS_SUBSCRIPTION_STATUSES,
  LIVE_SUBSCRIPTION_STATUSES,
  MEMBERSHIP_REFERENCE_TYPE,
  MembershipPlanStatus,
  RENEWAL_WINDOW_DAYS,
  SubscriptionStatus,
} from './memberships.enums';
import { SubscriptionsService } from './subscriptions.service';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MembershipCheckoutService {
  constructor(
    @InjectRepository(MembershipPlan) private readonly planRepo: Repository<MembershipPlan>,
    @InjectRepository(Subscription) private readonly subRepo: Repository<Subscription>,
    private readonly payments: PaymentsService,
    private readonly settlement: PaymentSettlementService,
    private readonly subscriptions: SubscriptionsService,
    private readonly gateway: PaymentsGateway,
  ) {}

  /** Creates the Razorpay order for ONE month of a plan. The price comes from the database. */
  async checkout(studentId: string, planId: string) {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan || plan.status !== MembershipPlanStatus.ACTIVE) {
      throw new NotFoundException('This membership plan is not available');
    }

    await this.subscriptions.expireDue();
    const live = await this.subRepo.findOne({
      where: { studentId, membershipPlanId: plan.id, status: In(LIVE_SUBSCRIPTION_STATUSES) },
      order: { currentPeriodEnd: 'DESC' },
    });

    if (live) {
      if (live.status === SubscriptionStatus.PAUSED) {
        throw new ConflictException('This subscription is paused. Please contact support.');
      }
      const coveredMs = live.currentPeriodEnd.getTime() - Date.now();
      if (ACCESS_SUBSCRIPTION_STATUSES.includes(live.status) && coveredMs > RENEWAL_WINDOW_DAYS * DAY_MS) {
        throw new ConflictException(
          `You are already subscribed until ${live.currentPeriodEnd.toISOString().slice(0, 10)}. Renewal opens ${RENEWAL_WINDOW_DAYS} days before that.`,
        );
      }
    }

    const order = await this.payments.createOrderForItems(
      studentId,
      [
        {
          referenceType: MEMBERSHIP_REFERENCE_TYPE,
          referenceId: plan.id,
          amount: Number(plan.price), // 2-decimal NUMERIC -> fine for the Razorpay order; the ledger uses exact paise strings
          quantity: 1,
        },
      ],
      plan.currency,
    );

    return {
      razorpayOrderId: order.razorpayOrderId,
      amount: order.amount, // paise, as Razorpay expects
      currency: order.currency,
      keyId: order.keyId,
      planName: plan.name,
    };
  }

  /**
   * Called by the browser after Razorpay's popup succeeds. The signature is verified by the existing
   * PaymentsService; the money + access side is settled by PaymentSettlementService, which is
   * idempotent with the webhook and the mobile return URL.
   */
  async verify(studentId: string, dto: VerifyPaymentDto) {
    // Reject anything that is not THIS student's membership order BEFORE touching its status.
    const existing = await this.payments.findByProviderOrderId(dto.razorpayOrderId);
    if (!existing || existing.userId !== studentId) throw new NotFoundException('Payment not found');
    if (!existing.items.some((item) => item.referenceType === MEMBERSHIP_REFERENCE_TYPE)) {
      throw new BadRequestException('This payment is not a membership payment');
    }

    const payment = await this.payments.verifyAndConfirm(studentId, dto);
    if (payment.status !== PaymentStatus.PAID) throw new NotFoundException('Payment was not completed');

    const result = await this.settlement.settle(payment.id);

    this.gateway.notifyPaymentSuccess(payment.userId, {
      orderId: payment.providerOrderId,
      paymentId: payment.providerPaymentId ?? '',
      enrolledCourseIds: [], // a membership enrolls in nothing - it is an entitlement
    });

    return { subscriptions: await this.subscriptions.findMineByIds(studentId, result.subscriptionIds) };
  }
}