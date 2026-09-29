import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { fromPaise, toPaise } from '../finance/money.util';
import { RevenueLedgerService } from '../finance/revenue-ledger.service';
import { PaymentItem } from './entities/payment-item.entity';
import { PaymentSettlement } from './entities/payment-settlement.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';

export interface SettlementResult {
  paymentId: string;
  userId: string;
  providerOrderId: string;
  providerPaymentId: string | null;
  courseIds: string[]; // every course_enrollment item in the payment
  revenuePostedNow: number; // ledger transactions created by THIS call (0 on any repeat)
  alreadySettled: boolean;
}

/**
 * The ONE authoritative place where a PAID payment becomes revenue + enrollments.
 *
 * Called by /enrollments/verify, the Razorpay webhook and the mobile return URL.
 * Safe to call any number of times, in any order, concurrently:
 *   1. The payment row is locked, so concurrent callers queue up.
 *   2. payment_settlements.paymentId is UNIQUE, and a settled payment returns early.
 *   3. The ledger is independently idempotent per payment item.
 *
 * Everything happens in one database transaction: a failure leaves no ledger rows,
 * no enrollments and no marker. Nothing here reads request input; amounts come from
 * PaymentItem and the teacher from Course.
 *
 * Deliberately does NOT touch the cart or the WebSocket - callers do that after commit.
 */
@Injectable()
export class PaymentSettlementService {
  private readonly logger = new Logger(PaymentSettlementService.name);

  constructor(private readonly ledger: RevenueLedgerService) {}

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

    const base: SettlementResult = {
      paymentId: payment.id,
      userId: payment.userId,
      providerOrderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId,
      courseIds: courseItems.map((item) => item.referenceId),
      revenuePostedNow: 0,
      alreadySettled: false,
    };

    if (courseItems.length === 0) return base; // nothing course-related in this payment

    const marker = await manager.findOne(PaymentSettlement, { where: { paymentId: payment.id } });
    if (marker) return { ...base, alreadySettled: true };

    const courses = await manager.find(Course, { where: { id: In(base.courseIds) } });
    const courseById = new Map(courses.map((course) => [course.id, course]));

    // Reconciliation signal only (full check arrives in R14).
    const itemsTotalPaise = items.reduce((sum, item) => sum + toPaise(item.amount) * BigInt(item.quantity), 0n);
    if (itemsTotalPaise !== toPaise(payment.amount)) {
      this.logger.error(
        `Payment ${payment.id}: item total ${fromPaise(itemsTotalPaise)} != payment amount ${payment.amount}`,
      );
    }

    let revenueItems = 0;
    let revenuePostedNow = 0;

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

    await manager.insert(PaymentSettlement, {
      paymentId: payment.id,
      courseItemCount: courseItems.length,
      revenueTransactionCount: revenueItems,
    });

    return { ...base, revenuePostedNow };
  }
}
