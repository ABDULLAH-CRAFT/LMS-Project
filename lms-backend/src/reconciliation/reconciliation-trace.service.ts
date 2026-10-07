import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { divRoundHalfUp, fromPaise, toPaise } from '../finance/money.util';
import { PayoutBalanceService } from '../payouts/payout-balance.service';
import { LOCKED_SQL } from './reconciliation.checks';

type Row = Record<string, any>;

// Scores and pool shares are stored as integers with 4 implied decimals / parts-per-million.
// Both display as value / 10000 with four decimals (82.4000 and 6.8000 %).
const scaled4 = (v: bigint): string => {
  const negative = v < 0n;
  const abs = negative ? -v : v;
  return `${negative ? '-' : ''}${abs / 10000n}.${(abs % 10000n).toString().padStart(4, '0')}`;
};

const CATEGORIES = [
  { key: 'lessonCompletion', label: 'Lesson completions', metric: 'lessonCompletions', score: 'lessonScore', bps: 'lessonCompletionBps' },
  { key: 'courseCompletion', label: 'Course completions', metric: 'courseCompletions', score: 'courseCompletionScore', bps: 'courseCompletionBps' },
  { key: 'assessment', label: 'Assessment activity', metric: 'assessmentEvents', score: 'assessmentScore', bps: 'assessmentBps' },
  { key: 'returningLearners', label: 'Returning learners', metric: 'returningLearners', score: 'returningLearnerScore', bps: 'returningLearnerBps' },
  { key: 'rating', label: 'Student ratings', metric: 'ratingSum', score: 'ratingScore', bps: 'ratingBps' },
] as const;

@Injectable()
export class ReconciliationTraceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly balances: PayoutBalanceService,
  ) {}

  // ───────────────────────── teachers ─────────────────────────

  async listTeachers() {
    const rows: Row[] = await this.dataSource.query(
      `SELECT "id", "name", "email" FROM "users" WHERE "role"::text = 'teacher' ORDER BY "name" ASC`,
    );
    return rows.map((r) => ({ id: r.id as string, name: r.name as string, email: r.email as string }));
  }

  private async requireTeacher(teacherId: string) {
    const rows: Row[] = await this.dataSource.query(
      `SELECT "id", "name", "email" FROM "users" WHERE "id" = $1::uuid AND "role"::text = 'teacher'`,
      [teacherId],
    );
    if (rows.length === 0) throw new NotFoundException('Teacher not found');
    return { id: rows[0].id as string, name: rows[0].name as string, email: rows[0].email as string };
  }

  /** "Why did this teacher receive this amount?" - course sales, refunds, membership periods, balance, payouts. */
  async explainTeacher(teacherId: string) {
    const teacher = await this.requireTeacher(teacherId);

    const courseRows: Row[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(a."amount") FILTER (WHERE a."amount" > 0), 0)::text AS "earned",
              COALESCE(SUM(a."amount") FILTER (WHERE a."amount" < 0), 0)::text AS "adjustments",
              COUNT(*) FILTER (WHERE t."transactionType"::text = 'COURSE_PURCHASE')::int AS "sales",
              COUNT(*) FILTER (WHERE a."amount" < 0)::int AS "reversals"
         FROM "revenue_allocations" a
         JOIN "revenue_transactions" t ON t."id" = a."revenueTransactionId"
        WHERE a."recipientType"::text = 'TEACHER' AND a."recipientId" = $1::uuid AND a."sourceType"::text = 'COURSE_PURCHASE'`,
      [teacherId],
    );
    const course = courseRows[0];
    const courseNet = toPaise(course.earned) + toPaise(course.adjustments);

    const periodRows: Row[] = await this.dataSource.query(
      `SELECT p."id" AS "periodId", p."periodStart"::text AS "periodStart", p."periodEnd"::text AS "periodEnd", p."status"::text AS "status",
              c."id" AS "calculationId", c."runNumber", c."eligibleRevenue"::text AS "eligibleRevenue", c."teacherPool"::text AS "teacherPool",
              m."id" AS "allocationId", m."amount"::text AS "amount", m."poolSharePpm", m."finalScore"::text AS "finalScore"
         FROM "membership_period_allocations" m
         JOIN "revenue_periods" p ON p."id" = m."periodId" AND p."finalCalculationId" = m."calculationId"
         JOIN "revenue_period_calculations" c ON c."id" = m."calculationId"
        WHERE m."teacherId" = $1::uuid AND p."status"::text IN (${LOCKED_SQL})
        ORDER BY p."periodStart" DESC`,
      [teacherId],
    );
    const membershipTotal = periodRows.reduce((sum, r) => sum + toPaise(r.amount), 0n);
    const net = courseNet + membershipTotal;

    const balance = await this.balances.getTeacherBalance(teacherId);
    const payoutRows: Row[] = await this.dataSource.query(
      `SELECT "status"::text AS "status", COUNT(*)::int AS "count", COALESCE(SUM("amount"), 0)::text AS "amount"
         FROM "payouts" WHERE "teacherId" = $1::uuid GROUP BY "status"`,
      [teacherId],
    );

    return {
      teacher,
      courseSales: {
        earned: fromPaise(toPaise(course.earned)),
        refundAdjustments: fromPaise(toPaise(course.adjustments)),
        net: fromPaise(courseNet),
        sales: Number(course.sales),
        reversals: Number(course.reversals),
      },
      membership: {
        total: fromPaise(membershipTotal),
        periods: periodRows.map((r) => ({
          periodId: r.periodId as string,
          periodStart: r.periodStart as string,
          periodEnd: r.periodEnd as string,
          status: r.status as string,
          calculationId: r.calculationId as string,
          runNumber: Number(r.runNumber),
          eligibleRevenue: r.eligibleRevenue as string,
          teacherPool: r.teacherPool as string,
          poolSharePercent: scaled4(BigInt(r.poolSharePpm)),
          finalScore: scaled4(BigInt(r.finalScore)),
          amount: r.amount as string,
        })),
      },
      net: fromPaise(net),
      balance: balance.balances,
      payouts: payoutRows.map((r) => ({ status: r.status as string, count: Number(r.count), amount: r.amount as string })),
      // Ledger earnings must equal pending + available + processing + paid.
      reconciles: net === toPaise(balance.balances.lifetimeNet),
    };
  }

  /** Every course-revenue ledger line credited to this teacher (sales and refund reversals). */
  async courseLines(teacherId: string, limit: number, offset: number) {
    await this.requireTeacher(teacherId);
    const where = `a."recipientType"::text = 'TEACHER' AND a."recipientId" = $1::uuid AND a."sourceType"::text = 'COURSE_PURCHASE'`;

    const rows: Row[] = await this.dataSource.query(
      `SELECT a."id", t."occurredAt", t."transactionType"::text AS "type", a."amount"::text AS "teacherAmount",
              a."percentage"::text AS "percentage", t."amount"::text AS "transactionAmount", t."paymentId",
              c."title" AS "courseTitle", s."name" AS "studentName",
              y."id" AS "payoutId", y."status"::text AS "payoutStatus"
         FROM "revenue_allocations" a
         JOIN "revenue_transactions" t ON t."id" = a."revenueTransactionId"
         LEFT JOIN "courses" c ON c."id" = t."courseId"
         LEFT JOIN "users" s ON s."id" = t."studentId"
         LEFT JOIN "payout_items" pi ON pi."sourceKind"::text = 'COURSE_ALLOCATION' AND pi."sourceId" = a."id" AND pi."releasedAt" IS NULL
         LEFT JOIN "payouts" y ON y."id" = pi."payoutId"
        WHERE ${where}
        ORDER BY t."occurredAt" DESC, a."id" ASC
        LIMIT $2 OFFSET $3`,
      [teacherId, limit, offset],
    );
    const total: Row[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS "n" FROM "revenue_allocations" a WHERE ${where}`,
      [teacherId],
    );

    return {
      lines: rows.map((r) => ({
        id: r.id as string,
        occurredAt: r.occurredAt as string,
        type: r.type as string,
        courseTitle: (r.courseTitle as string | null) ?? null,
        studentName: (r.studentName as string | null) ?? null,
        paymentId: (r.paymentId as string | null) ?? null,
        transactionAmount: r.transactionAmount as string,
        percentage: r.percentage as string,
        teacherAmount: r.teacherAmount as string,
        payoutId: (r.payoutId as string | null) ?? null,
        payoutStatus: (r.payoutStatus as string | null) ?? null,
      })),
      paging: { limit, offset, total: Number(total[0].n) },
    };
  }

  /** Why this membership amount: pool x pool share, and the weighted engagement categories behind the share. */
  async engagementBreakdown(teacherId: string, periodId: string) {
    const teacher = await this.requireTeacher(teacherId);

    const rows: Row[] = await this.dataSource.query(
      `SELECT p."periodStart"::text AS "periodStart", p."periodEnd"::text AS "periodEnd", p."status"::text AS "status",
              c."id" AS "calculationId", c."runNumber", c."eligibleRevenue"::text AS "eligibleRevenue",
              c."platformPercentage"::text AS "platformPercentage", c."teacherPercentage"::text AS "teacherPercentage",
              c."teacherPool"::text AS "teacherPool", c."distributedAmount"::text AS "distributedAmount",
              m."id" AS "allocationId", m."amount"::text AS "amount", m."poolSharePpm",
              s."lessonCompletions", s."courseCompletions", s."assessmentEvents", s."returningLearners", s."ratingSum", s."activeLearners",
              s."lessonScore"::text AS "lessonScore", s."courseCompletionScore"::text AS "courseCompletionScore",
              s."assessmentScore"::text AS "assessmentScore", s."returningLearnerScore"::text AS "returningLearnerScore",
              s."ratingScore"::text AS "ratingScore", s."finalScore"::text AS "finalScore",
              r."weights" AS "weights", r."totalScore"::text AS "runTotalScore", r."teacherCount" AS "runTeacherCount"
         FROM "membership_period_allocations" m
         JOIN "revenue_periods" p ON p."id" = m."periodId" AND p."finalCalculationId" = m."calculationId"
         JOIN "revenue_period_calculations" c ON c."id" = m."calculationId"
         JOIN "engagement_scores" s ON s."id" = m."engagementScoreId"
         JOIN "engagement_score_runs" r ON r."id" = s."runId"
        WHERE m."teacherId" = $1::uuid AND m."periodId" = $2::uuid AND p."status"::text IN (${LOCKED_SQL})`,
      [teacherId, periodId],
    );
    if (rows.length === 0) throw new NotFoundException('No finalized membership allocation for this teacher in that period');
    const r = rows[0];

    const finalScore = BigInt(r.finalScore);
    let weighted = 0n;
    const categories = CATEGORIES.map((cat) => {
      const score = BigInt(r[cat.score]);
      const bps = BigInt(r.weights[cat.bps]);
      weighted += score * bps;
      const contribution = divRoundHalfUp(score * bps, 10000n);
      return {
        key: cat.key,
        label: cat.label,
        rawMetric: Number(r[cat.metric]),
        categoryScore: scaled4(score),
        weightPercent: fromPaise(bps), // basis points -> "40.00"
        contribution: scaled4(contribution),
        shareOfFinalPercent: finalScore > 0n ? fromPaise(divRoundHalfUp(contribution * 10000n, finalScore)) : '0.00',
      };
    });

    return {
      teacher,
      period: { periodId, periodStart: r.periodStart as string, periodEnd: r.periodEnd as string, status: r.status as string },
      calculation: {
        calculationId: r.calculationId as string,
        runNumber: Number(r.runNumber),
        eligibleRevenue: r.eligibleRevenue as string,
        platformPercentage: r.platformPercentage as string,
        teacherPercentage: r.teacherPercentage as string,
        teacherPool: r.teacherPool as string,
        distributedAmount: r.distributedAmount as string,
      },
      engagement: {
        activeLearners: Number(r.activeLearners),
        categories,
        finalScore: scaled4(finalScore),
        runTotalScore: scaled4(BigInt(r.runTotalScore)),
        teachersInRun: Number(r.runTeacherCount),
        // Re-derives the final score from the stored category scores and weights.
        scoreVerified: divRoundHalfUp(weighted, 10000n) === finalScore,
      },
      allocation: {
        allocationId: r.allocationId as string,
        poolSharePercent: scaled4(BigInt(r.poolSharePpm)),
        amount: r.amount as string,
      },
    };
  }

  // ───────────────────────── payment trace ─────────────────────────

  async paymentTrace(paymentId: string) {
    const payments: Row[] = await this.dataSource.query(
      `SELECT p."id", p."amount"::text AS "amount", p."currency", p."status"::text AS "status", p."provider",
              p."providerOrderId", p."providerPaymentId", p."createdAt", p."updatedAt",
              u."name" AS "studentName", u."email" AS "studentEmail"
         FROM "payments" p LEFT JOIN "users" u ON u."id"::text = p."userId"::text
        WHERE p."id" = $1::uuid`,
      [paymentId],
    );
    if (payments.length === 0) throw new NotFoundException('Payment not found');
    const payment = payments[0];

    const settlements: Row[] = await this.dataSource.query(
      `SELECT "courseItemCount", "membershipItemCount", "revenueTransactionCount", "settledAt" FROM "payment_settlements" WHERE "paymentId" = $1::uuid`,
      [paymentId],
    );

    const items: Row[] = await this.dataSource.query(
      `SELECT i."id", i."referenceType", i."referenceId", (i."amount" * i."quantity")::text AS "lineTotal", i."quantity",
              COALESCE(c."title", mp."name") AS "label"
         FROM "payment_items" i
         LEFT JOIN "courses" c ON i."referenceType" = 'course_enrollment' AND c."id"::text = i."referenceId"
         LEFT JOIN "membership_plans" mp ON i."referenceType" = 'membership_plan' AND mp."id"::text = i."referenceId"
        WHERE i."paymentId" = $1::uuid
        ORDER BY i."id" ASC`,
      [paymentId],
    );

    const ledger: Row[] = await this.dataSource.query(
      `SELECT t."id", t."transactionType"::text AS "type", t."amount"::text AS "amount", t."paymentItemId",
              t."reversesTransactionId", t."periodId", t."occurredAt"
         FROM "revenue_transactions" t WHERE t."paymentId" = $1::uuid ORDER BY t."occurredAt" ASC, t."createdAt" ASC`,
      [paymentId],
    );

    const allocations: Row[] = await this.dataSource.query(
      `SELECT a."id", a."revenueTransactionId", a."recipientType"::text AS "recipientType", a."recipientId", u."name" AS "recipientName",
              a."percentage"::text AS "percentage", a."amount"::text AS "amount",
              y."id" AS "payoutId", y."status"::text AS "payoutStatus"
         FROM "revenue_allocations" a
         JOIN "revenue_transactions" t ON t."id" = a."revenueTransactionId"
         LEFT JOIN "users" u ON u."id" = a."recipientId"
         LEFT JOIN "payout_items" pi ON pi."sourceKind"::text = 'COURSE_ALLOCATION' AND pi."sourceId" = a."id" AND pi."releasedAt" IS NULL
         LEFT JOIN "payouts" y ON y."id" = pi."payoutId"
        WHERE t."paymentId" = $1::uuid
        ORDER BY a."recipientType" ASC, a."id" ASC`,
      [paymentId],
    );

    const subscriptions: Row[] = await this.dataSource.query(
      `SELECT sp."id", sp."paymentItemId", sp."periodStart", sp."periodEnd", sp."amount"::text AS "amount",
              s."id" AS "subscriptionId", s."status"::text AS "subscriptionStatus"
         FROM "subscription_payments" sp JOIN "subscriptions" s ON s."id" = sp."subscriptionId"
        WHERE sp."paymentId" = $1::uuid`,
      [paymentId],
    );

    const refunds: Row[] = await this.dataSource.query(
      `SELECT r."id", r."kind", r."amount"::text AS "amount", r."providerRefundId", r."occurredAt", r."reason"
         FROM "refunds" r WHERE r."paymentId" = $1::uuid ORDER BY r."occurredAt" ASC`,
      [paymentId],
    );

    const itemsOut = items.map((i) => {
      const itemLedger = ledger.filter((t) => t.paymentItemId === i.id);
      const originalIds = new Set(itemLedger.filter((t) => t.type === 'COURSE_PURCHASE' || t.type === 'MEMBERSHIP_PAYMENT').map((t) => t.id));
      const net = itemLedger.reduce((sum, t) => sum + toPaise(t.amount), 0n);
      const settledType = i.referenceType === 'course_enrollment' || i.referenceType === 'membership_plan';
      return {
        id: i.id as string,
        referenceType: i.referenceType as string,
        label: (i.label as string | null) ?? null,
        lineTotal: i.lineTotal as string,
        hasRevenue: originalIds.size > 0,
        needsRevenue: settledType && toPaise(i.lineTotal) > 0n && payment.status === 'paid',
        netLedgerAmount: fromPaise(net),
        ledger: itemLedger.map((t) => ({
          id: t.id as string,
          type: t.type as string,
          amount: t.amount as string,
          occurredAt: t.occurredAt as string,
          periodId: (t.periodId as string | null) ?? null,
          allocations: allocations
            .filter((a) => a.revenueTransactionId === t.id)
            .map((a) => ({
              id: a.id as string,
              recipientType: a.recipientType as string,
              recipientName: (a.recipientName as string | null) ?? null,
              percentage: a.percentage as string,
              amount: a.amount as string,
              payoutId: (a.payoutId as string | null) ?? null,
              payoutStatus: (a.payoutStatus as string | null) ?? null,
            })),
        })),
        subscriptionPayment: (() => {
          const sp = subscriptions.find((s) => s.paymentItemId === i.id);
          return sp
            ? { id: sp.id as string, subscriptionId: sp.subscriptionId as string, status: sp.subscriptionStatus as string, periodStart: sp.periodStart as string, periodEnd: sp.periodEnd as string, amount: sp.amount as string }
            : null;
        })(),
      };
    });

    return {
      payment: {
        id: payment.id as string,
        amount: payment.amount as string,
        currency: payment.currency as string,
        status: payment.status as string,
        provider: payment.provider as string,
        providerOrderId: payment.providerOrderId as string,
        providerPaymentId: (payment.providerPaymentId as string | null) ?? null,
        createdAt: payment.createdAt as string,
        updatedAt: payment.updatedAt as string,
        studentName: (payment.studentName as string | null) ?? null,
        studentEmail: (payment.studentEmail as string | null) ?? null,
      },
      settlement: settlements[0]
        ? {
            courseItemCount: Number(settlements[0].courseItemCount),
            membershipItemCount: Number(settlements[0].membershipItemCount),
            revenueTransactionCount: Number(settlements[0].revenueTransactionCount),
            settledAt: settlements[0].settledAt as string,
          }
        : null,
      items: itemsOut,
      refunds: refunds.map((r) => ({
        id: r.id as string,
        kind: r.kind as string,
        amount: r.amount as string,
        providerRefundId: r.providerRefundId as string,
        occurredAt: r.occurredAt as string,
        reason: (r.reason as string | null) ?? null,
      })),
      flags: {
        itemsMissingRevenue: itemsOut.filter((i) => i.needsRevenue && !i.hasRevenue).length,
        paymentAmountMatchesItems:
          itemsOut.reduce((sum, i) => sum + toPaise(i.lineTotal), 0n) === toPaise(payment.amount),
      },
    };
  }
}