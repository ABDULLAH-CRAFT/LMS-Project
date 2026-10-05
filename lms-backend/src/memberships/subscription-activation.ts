import { InternalServerErrorException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { fromPaise, toPaise } from '../finance/money.util';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentItem } from '../payment/entities/payment-item.entity';
import { MembershipPlan } from './entities/membership-plan.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { ACCESS_SUBSCRIPTION_STATUSES, LIVE_SUBSCRIPTION_STATUSES, SubscriptionStatus } from './memberships.enums';

export interface ActivationResult {
  subscriptionId: string;
  created: boolean; // false = this payment item had already been applied
  amount: string; // exactly what the student paid for this item
  periodStart: Date;
  periodEnd: Date;
}

/** Calendar-month addition in UTC, clamped to month end (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/**
 * Plain function (not an injectable) so PaymentSettlementService can call it without PaymentsModule
 * depending on MembershipsModule (which would be a module cycle). Runs inside the settlement
 * transaction; the payment row is already locked by the caller.
 *
 * Everything is read from the database: the plan from item.referenceId, the amount from the
 * PaymentItem, the student from the Payment. Nothing here comes from a request.
 */
export async function activateMembershipItem(
  manager: EntityManager,
  payment: Payment,
  item: PaymentItem,
  paidAt: Date,
): Promise<ActivationResult> {
  // Already applied? (belt and braces - the settlement marker normally short-circuits first.)
  const already = await manager.findOne(SubscriptionPayment, { where: { paymentItemId: item.id } });
  if (already) {
    return {
      subscriptionId: already.subscriptionId,
      created: false,
      amount: already.amount,
      periodStart: already.periodStart,
      periodEnd: already.periodEnd,
    };
  }

  const plan = await manager.findOne(MembershipPlan, { where: { id: item.referenceId } });
  if (!plan) {
    // Roll everything back rather than keep money we cannot attribute to a plan.
    throw new InternalServerErrorException(`Membership plan ${item.referenceId} of payment ${payment.id} no longer exists`);
  }

  const amount = fromPaise(toPaise(item.amount) * BigInt(item.quantity));

  // Lock the student's live subscription for this plan (if any) so two renewals cannot race.
  const live = await manager
    .getRepository(Subscription)
    .createQueryBuilder('s')
    .setLock('pessimistic_write')
    .where('s.studentId = :studentId', { studentId: payment.userId })
    .andWhere('s.membershipPlanId = :planId', { planId: plan.id })
    .andWhere('s.status IN (:...statuses)', { statuses: LIVE_SUBSCRIPTION_STATUSES })
    .orderBy('s.currentPeriodEnd', 'DESC')
    .limit(1)
    .getOne();

  const stillCovered =
    !!live && ACCESS_SUBSCRIPTION_STATUSES.includes(live.status) && live.currentPeriodEnd.getTime() > paidAt.getTime();

  // Early renewal continues from the current paid-through date; a lapsed/new one starts at payment time.
  const periodStart = stillCovered ? live.currentPeriodEnd : paidAt;
  const periodEnd = addMonths(periodStart, 1);

  let subscriptionId: string;

  if (live) {
    await manager.update(
      Subscription,
      { id: live.id },
      {
        status: SubscriptionStatus.ACTIVE,
        // For an early renewal the CURRENT period stays as it is; only the paid-through date moves.
        currentPeriodStart: stillCovered ? live.currentPeriodStart : paidAt,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
    );
    subscriptionId = live.id;
  } else {
    const inserted = await manager.insert(Subscription, {
      studentId: payment.userId,
      membershipPlanId: plan.id,
      provider: 'razorpay',
      providerSubscriptionId: null,
      status: SubscriptionStatus.ACTIVE,
      startDate: paidAt,
      currentPeriodStart: paidAt,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
    });
    subscriptionId = inserted.identifiers[0].id as string;
  }

  await manager.insert(SubscriptionPayment, {
    subscriptionId,
    paymentId: payment.id,
    paymentItemId: item.id,
    periodStart,
    periodEnd,
    amount,
    currency: payment.currency,
  });

  return { subscriptionId, created: true, amount, periodStart, periodEnd };
}