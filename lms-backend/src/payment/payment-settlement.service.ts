import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { fromPaise, toPaise } from '../finance/money.util';
import { RevenueLedgerService } from '../finance/revenue-ledger.service';
import { RevenuePeriodService } from '../finance/revenue-period.service'; // R7
import { SubscriptionPayment } from '../memberships/entities/subscription-payment.entity'; // R7
import { MEMBERSHIP_REFERENCE_TYPE } from '../memberships/memberships.enums'; // R7
import { activateMembershipItem } from '../memberships/subscription-activation'; // R7
import { PaymentItem } from './entities/payment-item.entity';
import { PaymentSettlement } from './entities/payment-settlement.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';

export interface SettlementResult {
  paymentId: string;
  userId: string;
  providerOrderId: string;
  providerPaymentId: string | null;
  courseIds: string[]; // every course_enrollment item in the payment
  subscriptionIds: string[]; // R7: subscriptions activated / renewed by this payment
  revenuePostedNow: number; // ledger transactions created by THIS call (0 on any repeat)
  alreadySettled: boolean;
}

/**
 * The ONE authoritative place where a PAID payment becomes revenue + access.
 *   - course_enrollment items -> COURSE_PURCHASE ledger rows (30/70 allocations) + Enrollment   (R2)
 *   - membership_plan items   -> MEMBERSHIP_PAYMENT ledger row (pooled into the monthly revenue
 *                                period) + subscription activation / renewal                    (R7)
 *
 * Called by /enrollments/verify, /memberships/verify, the Razorpay webhook and the mobile return URL.
 * Safe to call any number of times, in any order, concurrently:
 *   1. The payment row is locked, so concurrent callers queue up.
 *   2. payment_settlements.paymentId is UNIQUE, and a settled payment returns early.
 *   3. The ledger and subscription_payments are independently idempotent per payment item.
 *
 * Everything happens in one database transaction: a failure leaves no ledger rows, no enrollments,
 * no subscription changes and no marker. Nothing here reads request input; amounts come from
 * PaymentItem, the teacher from Course, the plan from the item's referenceId.
 *
 * Deliberately does NOT touch the cart or the WebSocket - callers do that after commit.
 */
@Injectable()
export class PaymentSettlementService {
  private readonly logger = new Logger(PaymentSettlementService.name);

  constructor(
    private readonly ledger: RevenueLedgerService,
    private readonly periods: RevenuePeriodService, // R7
  ) {}

  settle(paymentId: string): Promise<SettlementResult> {
    return this.ledger.runInTransaction((manager) => this.settleInTransaction(paymentId, manager));
  }

  /** Same as settle() but joins a transaction the caller already opened. */
  async settleInTransaction(paymentId: string, manager: EntityManager): Promise<SettlementResult> {
    // Lock the payment row (query builder on purpose: Payment has an eager relation,
    // and FOR UPDATE cannot be combined with the outer join it would add).
    const payment = await manager
      .getRepository(Payment)
      .createQueryBuilder('p')
      .setLock('pessimistic_write')
      .where('p.id = :paymentId', { paymentId })
      .getOne();

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PAID) {
      throw new ConflictException('Only a PAID payment can be settled');
    }

    const items = await manager.find(PaymentItem, { where: { payment: { id: payment.id } } });
    const courseItems = items.filter((item) => item.referenceType === 'course_enrollment');
    const membershipItems = items.filter((item) => item.referenceType === MEMBERSHIP_REFERENCE_TYPE); // R7

    const base: SettlementResult = {
      paymentId: payment.id,
      userId: payment.userId,
      providerOrderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId,
      courseIds: courseItems.map((item) => item.referenceId),
      subscriptionIds: [],
      revenuePostedNow: 0,
      alreadySettled: false,
    };

    if (courseItems.length === 0 && membershipItems.length === 0) return base; // nothing we settle in this payment

    const marker = await manager.findOne(PaymentSettlement, { where: { paymentId: payment.id } });
    if (marker) {
      const applied = await manager.find(SubscriptionPayment, { where: { paymentId: payment.id } });
      return { ...base, subscriptionIds: [...new Set(applied.map((row) => row.subscriptionId))], alreadySettled: true };
    }

    // Reconciliation signal only (full check arrives in R14).
    const itemsTotalPaise = items.reduce((sum, item) => sum + toPaise(item.amount) * BigInt(item.quantity), 0n);
    if (itemsTotalPaise !== toPaise(payment.amount)) {
      this.logger.error(
        `Payment ${payment.id}: item total ${fromPaise(itemsTotalPaise)} != payment amount ${payment.amount}`,
      );
    }

    let revenueItems = 0;
    let revenuePostedNow = 0;

    // ───────── course purchases (unchanged from R2) ─────────
    if (courseItems.length > 0) {
      const courses = await manager.find(Course, { where: { id: In(base.courseIds) } });
      const courseById = new Map(courses.map((course) => [course.id, course]));

      for (const item of courseItems) {
        const course = courseById.get(item.referenceId);
        if (!course) {
          // Roll everything back rather than take money we cannot attribute to a teacher.
          throw new InternalServerErrorException(`Course ${item.referenceId} of payment ${payment.id} no longer exists`);
        }

        const linePaise = toPaise(item.amount) * BigInt(item.quantity);
        if (linePaise > 0n) {
          const posted = await this.ledger.postCoursePurchase(
            {
              paymentId: payment.id,
              paymentItemId: item.id,
              courseId: course.id,
              studentId: payment.userId,
              teacherId: course.teacherId, // authoritative: from the DB, never from the request
              amount: fromPaise(linePaise),
              currency: payment.currency,
              occurredAt: payment.updatedAt, // when the payment became PAID
            },
            manager,
          );
          revenueItems++;
          if (posted.created) revenuePostedNow++;
        }

        const enrolled = await manager.count(Enrollment, {
          where: { studentId: payment.userId, courseId: course.id },
        });
        if (enrolled === 0) {
          await manager.insert(Enrollment, { studentId: payment.userId, courseId: course.id });
        }
      }
    }

    // ───────── membership payments (R7) ─────────
    const subscriptionIds: string[] = [];
    for (const item of membershipItems) {
      const linePaise = toPaise(item.amount) * BigInt(item.quantity);
      if (linePaise <= 0n) {
        throw new InternalServerErrorException(`Membership item ${item.id} of payment ${payment.id} has no positive amount`);
      }

      // 1. access: create / extend the subscription (reads the plan from the DB)
      const activation = await activateMembershipItem(manager, payment, item, payment.updatedAt);
      subscriptionIds.push(activation.subscriptionId);

      // 2. money: pool the payment into this month's OPEN revenue period (no teacher allocations yet)
      const period = await this.periods.resolveOpenPeriod(payment.updatedAt, manager);
      const posted = await this.ledger.postMembershipPayment(
        {
          paymentId: payment.id,
          paymentItemId: item.id,
          studentId: payment.userId,
          amount: fromPaise(linePaise),
          currency: payment.currency,
          periodId: period.id,
          occurredAt: payment.updatedAt,
        },
        manager,
      );
      revenueItems++;
      if (posted.created) revenuePostedNow++;
    }

    await manager.insert(PaymentSettlement, {
      paymentId: payment.id,
      courseItemCount: courseItems.length,
      membershipItemCount: membershipItems.length,
      revenueTransactionCount: revenueItems,
    });

    return { ...base, subscriptionIds: [...new Set(subscriptionIds)], revenuePostedNow };
  }
}