import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SCORE_SCALE, SHARE_SCALE } from '../engagement/engagement-score.calculator';
import { bpsToPercent, fromPaise, toPaise } from '../finance/money.util';
import { SubscriptionsService } from '../memberships/subscriptions.service';
import { averagePaise, averageRating, derivePayoutStatus, ratioPercent, scoreContribution } from './membership-analytics.math';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A renewal counts if the next paid month starts at the old paid-through date or within this many days after it.
const RENEWAL_GRACE_DAYS = 7;

const TREND_PERIODS = 12;

function assertUuid(value: string, label: string) {
  if (!UUID_RE.test(value)) throw new BadRequestException(`Invalid ${label}`);
}

// Money booked INTO one period for membership only (same rule R10 uses): payments, plus refunds/chargebacks of membership payments.
const PERIOD_MONEY_SQL = `
  SELECT COUNT(*) FILTER (WHERE t."transactionType" = 'MEMBERSHIP_PAYMENT')::int AS "paymentCount",
         COUNT(DISTINCT t."studentId") FILTER (WHERE t."transactionType" = 'MEMBERSHIP_PAYMENT')::int AS "payingSubscribers",
         COALESCE(SUM(t."amount") FILTER (WHERE t."transactionType" = 'MEMBERSHIP_PAYMENT'), 0)::text AS "gross",
         COALESCE(-SUM(t."amount") FILTER (WHERE t."transactionType" IN ('REFUND','CHARGEBACK')), 0)::text AS "refunds"
    FROM "revenue_transactions" t
    LEFT JOIN "revenue_transactions" o ON o."id" = t."reversesTransactionId"
   WHERE t."periodId" = $1
     AND (
       t."transactionType" = 'MEMBERSHIP_PAYMENT'
       OR (t."transactionType" IN ('REFUND','CHARGEBACK') AND o."transactionType" = 'MEMBERSHIP_PAYMENT')
     )
`;

// Subscriber movement inside one period. All windows are the IST calendar month of the period.
// "Active at T" = some paid month in subscription_payments covers T (periodStart <= T < periodEnd).
const PERIOD_SUBSCRIBERS_SQL = `
  WITH p AS (
    SELECT ("periodStart"::timestamp AT TIME ZONE 'Asia/Kolkata') AS s,
           (("periodEnd" + 1)::timestamp AT TIME ZONE 'Asia/Kolkata') AS e,
           LEAST((("periodEnd" + 1)::timestamp AT TIME ZONE 'Asia/Kolkata'), now()) AS at_end
      FROM "revenue_periods" WHERE "id" = $1
  ),
  start_active AS (
    SELECT DISTINCT sp."subscriptionId" AS id FROM "subscription_payments" sp, p
     WHERE sp."periodStart" <= p.s AND sp."periodEnd" > p.s
  ),
  end_active AS (
    SELECT DISTINCT sp."subscriptionId" AS id FROM "subscription_payments" sp, p
     WHERE sp."periodStart" <= p.at_end AND sp."periodEnd" > p.at_end
  ),
  due AS (
    SELECT sp."subscriptionId", sp."periodEnd" FROM "subscription_payments" sp, p
     WHERE sp."periodEnd" >= p.s AND sp."periodEnd" < p.e AND sp."periodEnd" <= now()
  ),
  flagged AS (
    SELECT EXISTS (
             SELECT 1 FROM "subscription_payments" n
              WHERE n."subscriptionId" = d."subscriptionId"
                AND n."periodStart" >= d."periodEnd"
                AND n."periodStart" < d."periodEnd" + ($2::int * interval '1 day')
           ) AS renewed,
           (d."periodEnd" + ($2::int * interval '1 day') > now()) AS undecided
      FROM due d
  )
  SELECT
    (SELECT COUNT(*) FROM "subscriptions" x, p WHERE x."startDate" >= p.s AND x."startDate" < p.e)::int AS "newSubscribers",
    (SELECT COUNT(*) FROM "subscriptions" x, p WHERE x."status" = 'CANCELLED' AND x."currentPeriodEnd" >= p.s AND x."currentPeriodEnd" < p.e)::int AS "cancelledSubscriptions",
    (SELECT COUNT(*) FROM "subscriptions" x, p WHERE x."status" = 'EXPIRED' AND x."currentPeriodEnd" >= p.s AND x."currentPeriodEnd" < p.e)::int AS "expiredSubscriptions",
    (SELECT COUNT(*) FROM "subscriptions" x, p WHERE x."cancelledAt" IS NOT NULL AND x."cancelledAt" >= p.s AND x."cancelledAt" < p.e)::int AS "cancellationRequests",
    (SELECT COUNT(*) FROM start_active)::int AS "activeAtStart",
    (SELECT COUNT(*) FROM end_active)::int AS "activeAtEnd",
    (SELECT COUNT(*) FROM start_active a WHERE NOT EXISTS (SELECT 1 FROM end_active b WHERE b.id = a.id))::int AS "lostSubscribers",
    (SELECT COUNT(*) FILTER (WHERE renewed) FROM flagged)::int AS "renewalsRenewed",
    (SELECT COUNT(*) FILTER (WHERE NOT renewed AND NOT undecided) FROM flagged)::int AS "renewalsLapsed",
    (SELECT COUNT(*) FILTER (WHERE NOT renewed AND undecided) FROM flagged)::int AS "renewalsPending"
`;

@Injectable()
export class MembershipAnalyticsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  // ───────────────────────── overview (KPIs + trend) ─────────────────────────

  /** Right-now figures, KPIs for one revenue period (default: the period that contains today, IST), and a 12-period trend. */
  async getOverview(periodId?: string) {
    if (periodId) assertUuid(periodId, 'period id');

    // Keep subscription statuses honest before counting them (same lazy lifecycle the other admin reads use).
    await this.subscriptions.expireDue();

    const period = await this.resolvePeriod(periodId);

    const [nowRow]: Record<string, string>[] = await this.dataSource.query(`
      SELECT COUNT(*) FILTER (WHERE s."status" IN ('ACTIVE','TRIALING') AND s."currentPeriodEnd" > now())::int AS "activeSubscribers",
             COUNT(*) FILTER (WHERE s."status" IN ('ACTIVE','TRIALING') AND s."currentPeriodEnd" > now() AND s."cancelAtPeriodEnd")::int AS "cancellingAtPeriodEnd",
             COUNT(*) FILTER (WHERE s."status" = 'PAST_DUE')::int AS "pastDue",
             COUNT(*) FILTER (WHERE s."status" = 'PAUSED')::int AS "paused",
             COALESCE(SUM(last."amount") FILTER (WHERE s."status" IN ('ACTIVE','TRIALING') AND s."currentPeriodEnd" > now()), 0)::text AS "mrr",
             COALESCE(SUM(last."amount") FILTER (WHERE s."status" IN ('ACTIVE','TRIALING') AND s."currentPeriodEnd" > now() AND s."cancelAtPeriodEnd"), 0)::text AS "mrrAtRisk"
        FROM "subscriptions" s
        LEFT JOIN LATERAL (
          SELECT x."amount" FROM "subscription_payments" x WHERE x."subscriptionId" = s."id" ORDER BY x."periodEnd" DESC LIMIT 1
        ) last ON true
    `);

    // MRR = what each live subscription actually paid for its latest month (not today's plan price).
    const rightNow = {
      activeSubscribers: Number(nowRow.activeSubscribers),
      cancellingAtPeriodEnd: Number(nowRow.cancellingAtPeriodEnd),
      pastDue: Number(nowRow.pastDue),
      paused: Number(nowRow.paused),
      monthlyRecurringRevenue: fromPaise(toPaise(nowRow.mrr)),
      mrrAtRisk: fromPaise(toPaise(nowRow.mrrAtRisk)),
    };

    let periodKpis: ReturnType<MembershipAnalyticsService['buildPeriodKpis']> | null = null;
    if (period) {
      const [money] = await this.dataSource.query(PERIOD_MONEY_SQL, [period.id]);
      const [moves] = await this.dataSource.query(PERIOD_SUBSCRIBERS_SQL, [period.id, RENEWAL_GRACE_DAYS]);
      periodKpis = this.buildPeriodKpis(money, moves);
    }

    const trendRows: any[] = await this.dataSource.query(
      `SELECT p."id" AS "periodId", p."periodStart"::text AS "periodStart", p."periodEnd"::text AS "periodEnd", p."status"::text AS "status",
              live."gross", live."refunds", live."payingSubscribers",
              (SELECT COUNT(*) FROM "subscriptions" s
                WHERE s."startDate" >= (p."periodStart"::timestamp AT TIME ZONE 'Asia/Kolkata')
                  AND s."startDate" < ((p."periodEnd" + 1)::timestamp AT TIME ZONE 'Asia/Kolkata'))::int AS "newSubscribers"
         FROM "revenue_periods" p
        CROSS JOIN LATERAL (
          SELECT COUNT(DISTINCT t."studentId") FILTER (WHERE t."transactionType" = 'MEMBERSHIP_PAYMENT')::int AS "payingSubscribers",
                 COALESCE(SUM(t."amount") FILTER (WHERE t."transactionType" = 'MEMBERSHIP_PAYMENT'), 0)::text AS "gross",
                 COALESCE(-SUM(t."amount") FILTER (WHERE t."transactionType" IN ('REFUND','CHARGEBACK')), 0)::text AS "refunds"
            FROM "revenue_transactions" t
            LEFT JOIN "revenue_transactions" o ON o."id" = t."reversesTransactionId"
           WHERE t."periodId" = p."id"
             AND (t."transactionType" = 'MEMBERSHIP_PAYMENT'
                  OR (t."transactionType" IN ('REFUND','CHARGEBACK') AND o."transactionType" = 'MEMBERSHIP_PAYMENT'))
        ) live
        ORDER BY p."periodStart" DESC
        LIMIT $1`,
      [TREND_PERIODS],
    );

    const trend = trendRows
      .map((r) => {
        const gross = toPaise(r.gross);
        const refunds = toPaise(r.refunds);
        return {
          periodId: r.periodId as string,
          periodStart: r.periodStart as string,
          periodEnd: r.periodEnd as string,
          status: r.status as string,
          grossRevenue: fromPaise(gross),
          refundsAmount: fromPaise(refunds),
          netRevenue: fromPaise(gross - refunds),
          payingSubscribers: Number(r.payingSubscribers),
          newSubscribers: Number(r.newSubscribers),
        };
      })
      .reverse(); // oldest first, so a chart reads left to right

    return {
      asOf: new Date().toISOString(),
      renewalGraceDays: RENEWAL_GRACE_DAYS,
      rightNow,
      period,
      periodKpis,
      trend,
    };
  }

  // ───────────────────────── one period: revenue breakdown + teacher pool + engagement ─────────────────────────

  /**
   * Everything the admin needs to understand one month of membership money. Shows the FINAL calculation once the
   * period is finalized, otherwise the latest frozen run (a preview). Nothing is recalculated here: every figure is
   * read from the stored calculation, its allocations and the engagement run it used.
   */
  async getPeriodAnalytics(periodId: string) {
    assertUuid(periodId, 'period id');

    const periodRows: any[] = await this.dataSource.query(
      `SELECT p."id", p."periodStart"::text AS "periodStart", p."periodEnd"::text AS "periodEnd", p."status"::text AS "status",
              (p."periodEnd" < (now() AT TIME ZONE 'Asia/Kolkata')::date) AS "ended",
              p."finalizedAt", p."finalCalculationId", fu."name" AS "finalizedByName"
         FROM "revenue_periods" p LEFT JOIN "users" fu ON fu."id" = p."finalizedById"
        WHERE p."id" = $1`,
      [periodId],
    );
    const period = periodRows[0];
    if (!period) throw new NotFoundException('Revenue period not found');

    const [money] = await this.dataSource.query(PERIOD_MONEY_SQL, [periodId]);
    const live = {
      paymentCount: Number(money.paymentCount),
      grossRevenue: fromPaise(toPaise(money.gross)),
      refundsAmount: fromPaise(toPaise(money.refunds)),
    };

    const calcRows: any[] = await this.dataSource.query(
      `SELECT c."id", c."runNumber", c."engagementRunId", er."runNumber" AS "engagementRunNumber", er."weights" AS "weights",
              c."platformPercentage"::text AS "platformPercentage", c."teacherPercentage"::text AS "teacherPercentage", c."taxRateBps",
              c."paymentCount", c."reversalCount",
              c."grossRevenue"::text AS "grossRevenue", c."refundsAmount"::text AS "refundsAmount", c."taxAmount"::text AS "taxAmount",
              c."eligibleRevenue"::text AS "eligibleRevenue", c."platformRevenue"::text AS "platformRevenue", c."teacherPool"::text AS "teacherPool",
              c."distributedAmount"::text AS "distributedAmount", c."undistributedAmount"::text AS "undistributedAmount",
              c."teacherCount", c."isPartialPeriod", c."calculatedAt", u."name" AS "calculatedByName"
         FROM "revenue_period_calculations" c
         JOIN "engagement_score_runs" er ON er."id" = c."engagementRunId"
         LEFT JOIN "users" u ON u."id" = c."calculatedById"
        WHERE c."periodId" = $1 AND ($2::uuid IS NULL OR c."id" = $2::uuid)
        ORDER BY c."runNumber" DESC
        LIMIT 1`,
      [periodId, period.finalCalculationId ?? null],
    );
    const calc = calcRows[0];

    const periodInfo = {
      id: period.id as string,
      periodStart: period.periodStart as string,
      periodEnd: period.periodEnd as string,
      status: period.status as string,
      ended: period.ended as boolean,
      finalizedAt: period.finalizedAt as Date | null,
      finalizedByName: period.finalizedByName as string | null,
    };

    if (!calc) {
      return { period: periodInfo, live, calculation: null, teachers: [], totals: null };
    }

    const weights = calc.weights as {
      lessonCompletionBps: number;
      courseCompletionBps: number;
      assessmentBps: number;
      returningLearnerBps: number;
      ratingBps: number;
    };

    const teacherRows: any[] = await this.dataSource.query(
      `WITH win AS (
         SELECT ("periodStart"::timestamp AT TIME ZONE 'Asia/Kolkata') AS s,
                (("periodEnd" + 1)::timestamp AT TIME ZONE 'Asia/Kolkata') AS e
           FROM "revenue_periods" WHERE "id" = $2
       ),
       ratings AS (
         -- Same filters the engagement run uses, so the count matches the stored ratingSum.
         SELECT x."teacherId", COUNT(*)::int AS "ratingCount"
           FROM "learning_activity_events" x, win
          WHERE x."eventType" = 'COURSE_RATED' AND x."accessVia" = 'MEMBERSHIP' AND x."points" > 0
            AND (x."metadata"->>'rating') ~ '^[1-5]$'
            AND x."occurredAt" >= win.s AND x."occurredAt" < win.e
          GROUP BY x."teacherId"
       )
       SELECT a."teacherId", t."name" AS "teacherName", a."finalScore"::text AS "finalScore", a."poolSharePpm", a."amount"::text AS "amount",
              s."activeLearners", s."lessonCompletions", s."courseCompletions", s."assessmentEvents", s."returningLearners", s."ratingSum",
              s."lessonScore"::text AS "lessonScore", s."courseCompletionScore"::text AS "courseCompletionScore",
              s."assessmentScore"::text AS "assessmentScore", s."returningLearnerScore"::text AS "returningLearnerScore",
              s."ratingScore"::text AS "ratingScore",
              COALESCE(r."ratingCount", 0)::int AS "ratingCount"
         FROM "membership_period_allocations" a
         JOIN "users" t ON t."id" = a."teacherId"
         JOIN "engagement_scores" s ON s."id" = a."engagementScoreId"
         LEFT JOIN ratings r ON r."teacherId" = a."teacherId"
        WHERE a."calculationId" = $1
        ORDER BY a."amount" DESC, a."finalScore" DESC, a."teacherId" ASC`,
      [calc.id, periodId],
    );

    const payoutStatus = derivePayoutStatus(period.status);
    let earningsPaise = 0n;

    const teachers = teacherRows.map((r) => {
      earningsPaise += toPaise(r.amount);
      return {
        teacherId: r.teacherId as string,
        teacherName: r.teacherName as string,
        finalScore: r.finalScore as string, // x scoreScale
        poolSharePpm: Number(r.poolSharePpm), // x shareScale
        membershipEarnings: r.amount as string,
        // Refunds that arrive after a period is finalized roll into the NEXT open period, so a finalized
        // period never changes and has no adjustment of its own. Real adjustments arrive with Phase R13.
        adjustments: '0.00',
        netEarnings: r.amount as string,
        payoutStatus,
        activeLearners: Number(r.activeLearners),
        lessonCompletions: Number(r.lessonCompletions),
        courseCompletions: Number(r.courseCompletions),
        assessmentActivity: Number(r.assessmentEvents),
        returningLearners: Number(r.returningLearners),
        ratingCount: Number(r.ratingCount),
        averageRating: averageRating(Number(r.ratingSum), Number(r.ratingCount)),
        categoryScores: {
          lesson: r.lessonScore as string,
          courseCompletion: r.courseCompletionScore as string,
          assessment: r.assessmentScore as string,
          returningLearner: r.returningLearnerScore as string,
          rating: r.ratingScore as string,
        },
        // How many points each category added to the final score (category score x its weight), same scale as finalScore.
        scoreContributions: {
          lesson: scoreContribution(BigInt(r.lessonScore), weights.lessonCompletionBps).toString(),
          courseCompletion: scoreContribution(BigInt(r.courseCompletionScore), weights.courseCompletionBps).toString(),
          assessment: scoreContribution(BigInt(r.assessmentScore), weights.assessmentBps).toString(),
          returningLearner: scoreContribution(BigInt(r.returningLearnerScore), weights.returningLearnerBps).toString(),
          rating: scoreContribution(BigInt(r.ratingScore), weights.ratingBps).toString(),
        },
      };
    });

    const distributedPaise = toPaise(calc.distributedAmount);

    return {
      period: periodInfo,
      live,
      calculation: {
        id: calc.id as string,
        runNumber: Number(calc.runNumber),
        isFinal: period.finalCalculationId === calc.id,
        isPartialPeriod: calc.isPartialPeriod as boolean,
        calculatedAt: calc.calculatedAt as Date,
        calculatedByName: calc.calculatedByName as string | null,
        engagementRunNumber: Number(calc.engagementRunNumber),
        platformPercentage: calc.platformPercentage as string,
        teacherPercentage: calc.teacherPercentage as string,
        taxRatePercent: bpsToPercent(BigInt(calc.taxRateBps)),
        paymentCount: Number(calc.paymentCount),
        reversalCount: Number(calc.reversalCount),
        grossRevenue: calc.grossRevenue as string,
        refundsAmount: calc.refundsAmount as string,
        taxAmount: calc.taxAmount as string,
        eligibleRevenue: calc.eligibleRevenue as string,
        platformRevenue: calc.platformRevenue as string,
        teacherPool: calc.teacherPool as string,
        distributedAmount: calc.distributedAmount as string,
        undistributedAmount: calc.undistributedAmount as string,
        teacherCount: Number(calc.teacherCount),
        weights: {
          lessonCompletionBps: weights.lessonCompletionBps,
          courseCompletionBps: weights.courseCompletionBps,
          assessmentBps: weights.assessmentBps,
          returningLearnerBps: weights.returningLearnerBps,
          ratingBps: weights.ratingBps,
        },
        scoreScale: Number(SCORE_SCALE),
        shareScale: Number(SHARE_SCALE),
      },
      teachers,
      totals: {
        membershipEarnings: fromPaise(earningsPaise),
        // Tie-out: the teacher rows must add up to what the frozen calculation says was distributed.
        matchesDistributedAmount: earningsPaise === distributedPaise,
      },
    };
  }

  // ───────────────────────── helpers ─────────────────────────

  /** The requested period, or the period that contains today (IST), or the newest period as a fallback. */
  private async resolvePeriod(periodId?: string) {
    const rows: any[] = await this.dataSource.query(
      periodId
        ? `SELECT "id", "periodStart"::text AS "periodStart", "periodEnd"::text AS "periodEnd", "status"::text AS "status",
                  ("periodEnd" >= (now() AT TIME ZONE 'Asia/Kolkata')::date) AS "partial"
             FROM "revenue_periods" WHERE "id" = $1`
        : `SELECT "id", "periodStart"::text AS "periodStart", "periodEnd"::text AS "periodEnd", "status"::text AS "status",
                  ("periodEnd" >= (now() AT TIME ZONE 'Asia/Kolkata')::date) AS "partial"
             FROM "revenue_periods"
            ORDER BY ("periodStart" <= (now() AT TIME ZONE 'Asia/Kolkata')::date AND "periodEnd" >= (now() AT TIME ZONE 'Asia/Kolkata')::date) DESC,
                     "periodStart" DESC
            LIMIT 1`,
      periodId ? [periodId] : [],
    );
    if (periodId && !rows[0]) throw new NotFoundException('Revenue period not found');
    const r = rows[0];
    return r
      ? { id: r.id as string, periodStart: r.periodStart as string, periodEnd: r.periodEnd as string, status: r.status as string, isPartial: r.partial as boolean }
      : null;
  }

  private buildPeriodKpis(money: any, moves: any) {
    const gross = toPaise(money.gross);
    const refunds = toPaise(money.refunds);
    const net = gross - refunds;
    const payingSubscribers = Number(money.payingSubscribers);

    const renewed = Number(moves.renewalsRenewed);
    const lapsed = Number(moves.renewalsLapsed);
    const activeAtStart = Number(moves.activeAtStart);
    const lost = Number(moves.lostSubscribers);

    return {
      newSubscribers: Number(moves.newSubscribers),
      cancelledSubscriptions: Number(moves.cancelledSubscriptions),
      expiredSubscriptions: Number(moves.expiredSubscriptions),
      cancellationRequests: Number(moves.cancellationRequests),
      activeAtStart,
      activeAtEnd: Number(moves.activeAtEnd),
      lostSubscribers: lost,
      churnRatePercent: ratioPercent(lost, activeAtStart), // lost / active at the start of the period
      renewalsRenewed: renewed,
      renewalsLapsed: lapsed,
      renewalsPending: Number(moves.renewalsPending), // still inside the grace window - not counted either way yet
      renewalRatePercent: ratioPercent(renewed, renewed + lapsed),
      paymentCount: Number(money.paymentCount),
      payingSubscribers,
      grossRevenue: fromPaise(gross),
      refundsAmount: fromPaise(refunds),
      netRevenue: fromPaise(net),
      averageRevenuePerSubscriber: averagePaise(net, payingSubscribers),
    };
  }
}