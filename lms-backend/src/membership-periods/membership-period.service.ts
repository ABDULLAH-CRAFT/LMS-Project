import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { SCORE_SCALE, SHARE_SCALE } from '../engagement/engagement-score.calculator';
import { EngagementScoreService } from '../engagement/engagement-score.service';
import { CALCULATION_VERSION, RevenueSourceType } from '../finance/finance.enums';
import { bpsToPercent, fromPaise, percentToBps, toPaise } from '../finance/money.util';
import { RevenueRulesService } from '../finance/revenue-rules.service';
import { MembershipTaxService } from './membership-tax.service';
import { calculatePeriodTotals, distributePool } from './period-calculator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCKED = new Set(['FINALIZED', 'PAYOUT_PROCESSING', 'PAID']);

type Runner = EntityManager | DataSource;

// Money booked INTO one period: membership payments, plus refunds/chargebacks of membership payments
// that were booked in this period (a refund hits the period in which it happened).
const LIVE_TOTALS_SQL = `
  SELECT COUNT(*) FILTER (WHERE t."transactionType" = 'MEMBERSHIP_PAYMENT')::int AS "paymentCount",
         COALESCE(SUM(t."amount") FILTER (WHERE t."transactionType" = 'MEMBERSHIP_PAYMENT'), 0)::text AS "gross",
         COUNT(*) FILTER (WHERE t."transactionType" IN ('REFUND','CHARGEBACK'))::int AS "reversalCount",
         COALESCE(-SUM(t."amount") FILTER (WHERE t."transactionType" IN ('REFUND','CHARGEBACK')), 0)::text AS "refunds"
    FROM "revenue_transactions" t
    LEFT JOIN "revenue_transactions" o ON o."id" = t."reversesTransactionId"
   WHERE t."periodId" = $1
     AND (
       t."transactionType" = 'MEMBERSHIP_PAYMENT'
       OR (t."transactionType" IN ('REFUND','CHARGEBACK') AND o."transactionType" = 'MEMBERSHIP_PAYMENT')
     )
`;

interface PeriodRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  ended: boolean;
  finalizedAt: Date | null;
  finalCalculationId: string | null;
}

interface Blocker {
  code: string;
  message: string;
}

function assertUuid(value: string, label: string) {
  if (!UUID_RE.test(value)) throw new BadRequestException(`Invalid ${label}`);
}

// Period rules and tax settings are read as of the LAST moment of the period (IST), the same instant the R7 projection used.
const endInstant = (periodEnd: string) => new Date(`${periodEnd}T23:59:59+05:30`);

@Injectable()
export class MembershipPeriodService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rules: RevenueRulesService,
    private readonly tax: MembershipTaxService,
    private readonly engagement: EngagementScoreService,
  ) {}

  // ───────────────────────── reads ─────────────────────────

  /** Admin list: every revenue period with live totals and its latest frozen calculation. */
  async listPeriods() {
    const rows: any[] = await this.dataSource.query(`
      SELECT p."id" AS "periodId", p."periodStart"::text AS "periodStart", p."periodEnd"::text AS "periodEnd", p."status"::text AS "status",
             (p."periodEnd" < (now() AT TIME ZONE 'Asia/Kolkata')::date) AS "ended",
             p."finalizedAt", fu."name" AS "finalizedByName",
             live."paymentCount", live."gross", live."refunds",
             c."id" AS "calcId", c."runNumber" AS "calcRunNumber", c."calculatedAt" AS "calcAt",
             c."eligibleRevenue"::text AS "eligible", c."platformRevenue"::text AS "platform", c."teacherPool"::text AS "pool",
             c."teacherCount" AS "teacherCount"
        FROM "revenue_periods" p
        LEFT JOIN "users" fu ON fu."id" = p."finalizedById"
        CROSS JOIN LATERAL (
          SELECT COUNT(*) FILTER (WHERE t."transactionType" = 'MEMBERSHIP_PAYMENT')::int AS "paymentCount",
                 COALESCE(SUM(t."amount") FILTER (WHERE t."transactionType" = 'MEMBERSHIP_PAYMENT'), 0)::text AS "gross",
                 COALESCE(-SUM(t."amount") FILTER (WHERE t."transactionType" IN ('REFUND','CHARGEBACK')), 0)::text AS "refunds"
            FROM "revenue_transactions" t
            LEFT JOIN "revenue_transactions" o ON o."id" = t."reversesTransactionId"
           WHERE t."periodId" = p."id"
             AND (t."transactionType" = 'MEMBERSHIP_PAYMENT'
                  OR (t."transactionType" IN ('REFUND','CHARGEBACK') AND o."transactionType" = 'MEMBERSHIP_PAYMENT'))
        ) live
        LEFT JOIN LATERAL (
          SELECT * FROM "revenue_period_calculations" x WHERE x."periodId" = p."id" ORDER BY x."runNumber" DESC LIMIT 1
        ) c ON true
       ORDER BY p."periodStart" DESC
       LIMIT 36
    `);

    return rows.map((r) => ({
      periodId: r.periodId,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      status: r.status,
      ended: r.ended,
      finalizedAt: r.finalizedAt,
      finalizedByName: r.finalizedByName,
      paymentCount: Number(r.paymentCount),
      grossRevenue: fromPaise(toPaise(r.gross)),
      refundsAmount: fromPaise(toPaise(r.refunds)),
      latestCalculation: r.calcId
        ? {
            id: r.calcId,
            runNumber: r.calcRunNumber,
            calculatedAt: r.calcAt,
            eligibleRevenue: r.eligible,
            platformRevenue: r.platform,
            teacherPool: r.pool,
            teacherCount: r.teacherCount,
          }
        : null,
    }));
  }

  /** One period: live figures, the latest frozen calculation with every teacher's amount, and whether it can be finalized. */
  async getDetail(periodId: string) {
    assertUuid(periodId, 'period id');

    const rows: any[] = await this.dataSource.query(
      `SELECT p."id", p."periodStart"::text AS "periodStart", p."periodEnd"::text AS "periodEnd", p."status"::text AS "status",
              (p."periodEnd" < (now() AT TIME ZONE 'Asia/Kolkata')::date) AS "ended",
              p."finalizedAt", p."finalCalculationId", fu."name" AS "finalizedByName"
         FROM "revenue_periods" p LEFT JOIN "users" fu ON fu."id" = p."finalizedById"
        WHERE p."id" = $1`,
      [periodId],
    );
    const period = rows[0] as (PeriodRow & { finalizedByName: string | null }) | undefined;
    if (!period) throw new NotFoundException('Revenue period not found');

    const live = await this.liveTotals(periodId, this.dataSource);

    const latestRows: { id: string }[] = await this.dataSource.query(
      `SELECT "id" FROM "revenue_period_calculations" WHERE "periodId" = $1 ORDER BY "runNumber" DESC LIMIT 1`,
      [periodId],
    );
    const latest = latestRows[0] ? await this.loadCalculation(latestRows[0].id, this.dataSource) : null;

    const history = await this.dataSource.query(
      `SELECT c."id", c."runNumber", c."calculatedAt", c."eligibleRevenue"::text AS "eligibleRevenue", c."teacherPool"::text AS "teacherPool",
              c."teacherCount", u."name" AS "calculatedByName"
         FROM "revenue_period_calculations" c LEFT JOIN "users" u ON u."id" = c."calculatedById"
        WHERE c."periodId" = $1 ORDER BY c."runNumber" DESC`,
      [periodId],
    );

    const readiness = await this.assessReadiness(period, latest, this.dataSource);

    return {
      period: {
        id: period.id,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        status: period.status,
        ended: period.ended,
        finalizedAt: period.finalizedAt,
        finalizedByName: period.finalizedByName,
        finalCalculationId: period.finalCalculationId,
      },
      live: {
        paymentCount: live.paymentCount,
        reversalCount: live.reversalCount,
        grossRevenue: fromPaise(live.grossPaise),
        refundsAmount: fromPaise(live.refundsPaise),
      },
      latestCalculation: latest,
      history,
      readiness: {
        canFinalize: readiness.blockers.length === 0,
        blockers: readiness.blockers,
        stale: readiness.stale,
        requiresUndistributedAcknowledgement: readiness.requiresUndistributedAck,
      },
    };
  }

  // ───────────────────────── calculate ─────────────────────────

  /**
   * Calculates and FREEZES one run for the period (OPEN/CALCULATED -> CALCULATING -> CALCULATED).
   * Every call is a NEW run; earlier runs are never edited. The period row is locked for the whole
   * calculation so two admins cannot create the same run number.
   */
  async calculate(periodId: string, adminId: string, refreshEngagement = false) {
    assertUuid(periodId, 'period id');

    const pre: { status: string }[] = await this.dataSource.query(`SELECT "status"::text AS "status" FROM "revenue_periods" WHERE "id" = $1`, [periodId]);
    if (!pre[0]) throw new NotFoundException('Revenue period not found');
    if (LOCKED.has(pre[0].status)) {
      throw new ConflictException(`Period is ${pre[0].status}; its calculation is frozen. Post an adjustment instead.`);
    }

    // The teacher shares come from a frozen R9 run. Create one if none exists yet (or if the admin asked for fresh scores).
    const existingRun = await this.latestEngagementRunId(periodId, this.dataSource);
    if (!existingRun || refreshEngagement) {
      await this.engagement.calculatePeriod(periodId, adminId);
    }

    await this.dataSource.transaction(async (manager) => {
      const period = await this.lockPeriod(manager, periodId);
      if (!period) throw new NotFoundException('Revenue period not found');
      if (period.status !== 'OPEN' && period.status !== 'CALCULATED') {
        throw new ConflictException(`Period is ${period.status}; it cannot be calculated right now`);
      }

      await manager.query(`UPDATE "revenue_periods" SET "status" = 'CALCULATING', "updatedAt" = now() WHERE "id" = $1`, [periodId]);

      const engagementRunId = await this.latestEngagementRunId(periodId, manager);
      if (!engagementRunId) throw new ConflictException('Engagement scores have not been calculated for this period');

      const at = endInstant(period.periodEnd);
      const rule = await this.rules.getEffectiveRule(RevenueSourceType.MEMBERSHIP_POOL, at, manager);
      const taxConfig = await this.tax.getEffective(at, manager);
      const live = await this.liveTotals(periodId, manager);

      const totals = calculatePeriodTotals({
        grossPaise: live.grossPaise,
        refundsPaise: live.refundsPaise,
        taxRateBps: BigInt(taxConfig.taxRateBps),
        platformBps: percentToBps(rule.platformPercentage),
        teacherBps: percentToBps(rule.teacherPercentage),
      });

      // Stored order = score descending, teacherId ascending. Rounding ties follow it, so the result is reproducible.
      const scores: { id: string; teacherId: string; finalScore: string; poolSharePpm: number }[] = await manager.query(
        `SELECT "id", "teacherId", "finalScore"::text AS "finalScore", "poolSharePpm"
           FROM "engagement_scores" WHERE "runId" = $1 ORDER BY "finalScore" DESC, "teacherId" ASC`,
        [engagementRunId],
      );

      const amounts = distributePool(
        totals.teacherPoolPaise,
        scores.map((s) => ({ teacherId: s.teacherId, poolSharePpm: BigInt(s.poolSharePpm) })),
      );
      const distributedPaise = amounts.reduce((acc, a) => acc + a.amountPaise, 0n);
      const undistributedPaise = totals.teacherPoolPaise - distributedPaise;

      const next: { n: number }[] = await manager.query(
        `SELECT COALESCE(MAX("runNumber"), 0) + 1 AS "n" FROM "revenue_period_calculations" WHERE "periodId" = $1`,
        [periodId],
      );

      const inserted: { id: string }[] = await manager.query(
        `INSERT INTO "revenue_period_calculations"
           ("periodId","runNumber","engagementRunId","revenueRuleId","taxConfigId","platformPercentage","teacherPercentage","taxRateBps",
            "paymentCount","reversalCount","grossRevenue","refundsAmount","taxAmount","eligibleRevenue","platformRevenue","teacherPool",
            "distributedAmount","undistributedAmount","teacherCount","isPartialPeriod","calculationVersion","calculatedById")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING "id"`,
        [
          periodId,
          next[0].n,
          engagementRunId,
          rule.id,
          taxConfig.id,
          rule.platformPercentage,
          rule.teacherPercentage,
          taxConfig.taxRateBps,
          live.paymentCount,
          live.reversalCount,
          fromPaise(totals.grossPaise),
          fromPaise(totals.refundsPaise),
          fromPaise(totals.taxPaise),
          fromPaise(totals.eligiblePaise),
          fromPaise(totals.platformPaise),
          fromPaise(totals.teacherPoolPaise),
          fromPaise(distributedPaise),
          fromPaise(undistributedPaise),
          scores.length,
          !period.ended,
          CALCULATION_VERSION,
          adminId,
        ],
      );
      const calculationId = inserted[0].id;

      for (let i = 0; i < scores.length; i++) {
        await manager.query(
          `INSERT INTO "membership_period_allocations"
             ("calculationId","periodId","teacherId","engagementScoreId","finalScore","poolSharePpm","amount")
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [calculationId, periodId, scores[i].teacherId, scores[i].id, scores[i].finalScore, scores[i].poolSharePpm, fromPaise(amounts[i].amountPaise)],
        );
      }

      // Mirror the latest calculation on the period row (still editable until FINALIZED).
      await manager.query(
        `UPDATE "revenue_periods"
            SET "status" = 'CALCULATED', "grossRevenue" = $2, "eligibleRevenue" = $3, "platformRevenue" = $4, "teacherPool" = $5, "updatedAt" = now()
          WHERE "id" = $1`,
        [periodId, fromPaise(totals.grossPaise), fromPaise(totals.eligiblePaise), fromPaise(totals.platformPaise), fromPaise(totals.teacherPoolPaise)],
      );
    });

    return this.getDetail(periodId);
  }

  // ───────────────────────── finalize ─────────────────────────

  /**
   * CALCULATED -> FINALIZED. The admin names the exact calculation they reviewed. Refused if the period has not
   * ended, if a newer calculation exists, or if payments/refunds/engagement scores/rules changed since the
   * calculation. Idempotent: finalizing the same calculation again returns the same result.
   */
  async finalize(periodId: string, calculationId: string, adminId: string, acknowledgeUndistributedPool = false) {
    assertUuid(periodId, 'period id');
    assertUuid(calculationId, 'calculation id');

    await this.dataSource.transaction(async (manager) => {
      const period = await this.lockPeriod(manager, periodId);
      if (!period) throw new NotFoundException('Revenue period not found');

      if (LOCKED.has(period.status)) {
        if (period.finalCalculationId === calculationId) return; // already done - same result
        throw new ConflictException('This period is already finalized with a different calculation');
      }

      const found: { id: string }[] = await manager.query(
        `SELECT "id" FROM "revenue_period_calculations" WHERE "id" = $1 AND "periodId" = $2`,
        [calculationId, periodId],
      );
      if (!found[0]) throw new NotFoundException('Calculation not found for this period');

      const latest = await this.loadCalculation(
        (
          await manager.query(`SELECT "id" FROM "revenue_period_calculations" WHERE "periodId" = $1 ORDER BY "runNumber" DESC LIMIT 1`, [periodId])
        )[0].id,
        manager,
      );
      if (latest.id !== calculationId) {
        throw new ConflictException('A newer calculation exists for this period. Review it and finalize that one.');
      }

      const readiness = await this.assessReadiness(period, latest, manager);
      if (readiness.blockers.length > 0) throw new ConflictException(readiness.blockers[0].message);

      if (readiness.requiresUndistributedAck && !acknowledgeUndistributedPool) {
        throw new ConflictException(
          `No teacher earned an engagement score, so the teacher pool of ${latest.teacherPool} cannot be distributed. ` +
            'Finalizing keeps that amount undistributed (retained by the platform) - confirm to proceed.',
        );
      }

      // The database guard re-checks that these figures and the teacher allocations match the frozen calculation.
      await manager.query(
        `UPDATE "revenue_periods" p
            SET "status" = 'FINALIZED', "finalizedAt" = now(), "finalizedById" = $2, "finalCalculationId" = c."id",
                "grossRevenue" = c."grossRevenue", "eligibleRevenue" = c."eligibleRevenue",
                "platformRevenue" = c."platformRevenue", "teacherPool" = c."teacherPool", "updatedAt" = now()
           FROM "revenue_period_calculations" c
          WHERE p."id" = $1 AND c."id" = $3 AND c."periodId" = p."id"`,
        [periodId, adminId, calculationId],
      );
    });

    return this.getDetail(periodId);
  }

  // ───────────────────────── helpers ─────────────────────────

  private async lockPeriod(manager: EntityManager, periodId: string): Promise<PeriodRow | null> {
    const rows: PeriodRow[] = await manager.query(
      `SELECT "id", "periodStart"::text AS "periodStart", "periodEnd"::text AS "periodEnd", "status"::text AS "status",
              ("periodEnd" < (now() AT TIME ZONE 'Asia/Kolkata')::date) AS "ended", "finalizedAt", "finalCalculationId"
         FROM "revenue_periods" WHERE "id" = $1 FOR UPDATE`,
      [periodId],
    );
    return rows[0] ?? null;
  }

  private async latestEngagementRunId(periodId: string, runner: Runner): Promise<string | null> {
    const rows: { id: string }[] = await runner.query(
      `SELECT "id" FROM "engagement_score_runs" WHERE "periodId" = $1 ORDER BY "runNumber" DESC LIMIT 1`,
      [periodId],
    );
    return rows[0]?.id ?? null;
  }

  private async liveTotals(periodId: string, runner: Runner) {
    const rows: { paymentCount: number; gross: string; reversalCount: number; refunds: string }[] = await runner.query(LIVE_TOTALS_SQL, [periodId]);
    const r = rows[0];
    return {
      paymentCount: Number(r.paymentCount),
      reversalCount: Number(r.reversalCount),
      grossPaise: toPaise(r.gross),
      refundsPaise: toPaise(r.refunds),
    };
  }

  /** A stored calculation exactly as frozen. Nothing here is recalculated. */
  private async loadCalculation(calculationId: string, runner: Runner) {
    const rows: any[] = await runner.query(
      `SELECT c."id", c."periodId", c."runNumber", c."engagementRunId", er."runNumber" AS "engagementRunNumber",
              c."revenueRuleId", c."taxConfigId",
              c."platformPercentage"::text AS "platformPercentage", c."teacherPercentage"::text AS "teacherPercentage", c."taxRateBps",
              c."paymentCount", c."reversalCount",
              c."grossRevenue"::text AS "grossRevenue", c."refundsAmount"::text AS "refundsAmount", c."taxAmount"::text AS "taxAmount",
              c."eligibleRevenue"::text AS "eligibleRevenue", c."platformRevenue"::text AS "platformRevenue", c."teacherPool"::text AS "teacherPool",
              c."distributedAmount"::text AS "distributedAmount", c."undistributedAmount"::text AS "undistributedAmount",
              c."teacherCount", c."isPartialPeriod", c."calculatedAt", u."name" AS "calculatedByName"
         FROM "revenue_period_calculations" c
         JOIN "engagement_score_runs" er ON er."id" = c."engagementRunId"
         LEFT JOIN "users" u ON u."id" = c."calculatedById"
        WHERE c."id" = $1`,
      [calculationId],
    );
    if (!rows[0]) throw new NotFoundException('Calculation not found');

    const teachers = await runner.query(
      `SELECT a."teacherId", t."name" AS "teacherName", a."finalScore"::text AS "finalScore", a."poolSharePpm", a."amount"::text AS "amount",
              s."lessonScore"::text AS "lessonScore", s."courseCompletionScore"::text AS "courseCompletionScore",
              s."assessmentScore"::text AS "assessmentScore", s."returningLearnerScore"::text AS "returningLearnerScore",
              s."ratingScore"::text AS "ratingScore", s."activeLearners"
         FROM "membership_period_allocations" a
         JOIN "users" t ON t."id" = a."teacherId"
         JOIN "engagement_scores" s ON s."id" = a."engagementScoreId"
        WHERE a."calculationId" = $1
        ORDER BY a."amount" DESC, a."finalScore" DESC, a."teacherId" ASC`,
      [calculationId],
    );

    return {
      ...rows[0],
      taxRatePercent: bpsToPercent(BigInt(rows[0].taxRateBps)),
      scoreScale: Number(SCORE_SCALE),
      shareScale: Number(SHARE_SCALE),
      teachers,
    };
  }

  /**
   * Can this period be finalized? Compares the frozen calculation with the CURRENT state. Used read-only by
   * getDetail() and under the period row lock by finalize().
   */
  private async assessReadiness(period: PeriodRow, latest: any | null, runner: Runner) {
    const blockers: Blocker[] = [];
    let stale = false;

    if (LOCKED.has(period.status)) {
      return { blockers: [{ code: 'ALREADY_FINALIZED', message: `Period is already ${period.status}` }], stale: false, requiresUndistributedAck: false };
    }
    if (!latest) {
      return { blockers: [{ code: 'NOT_CALCULATED', message: 'Calculate this period first' }], stale: false, requiresUndistributedAck: false };
    }
    if (period.status !== 'CALCULATED') {
      blockers.push({ code: 'STATUS', message: `Period is ${period.status}; only a CALCULATED period can be finalized` });
    }
    if (!period.ended) {
      blockers.push({ code: 'NOT_ENDED', message: `The period has not ended yet (it ends on ${period.periodEnd}, IST). Finalize after that.` });
    }

    const live = await this.liveTotals(period.id, runner);
    if (
      live.paymentCount !== Number(latest.paymentCount) ||
      live.reversalCount !== Number(latest.reversalCount) ||
      live.grossPaise !== toPaise(latest.grossRevenue) ||
      live.refundsPaise !== toPaise(latest.refundsAmount)
    ) {
      stale = true;
      blockers.push({ code: 'STALE_LEDGER', message: 'Payments or refunds changed after this calculation. Recalculate before finalizing.' });
    }

    const latestEngagement = await this.latestEngagementRunId(period.id, runner);
    if (latestEngagement !== latest.engagementRunId) {
      stale = true;
      blockers.push({ code: 'STALE_ENGAGEMENT', message: 'Engagement scores were recalculated after this calculation. Recalculate before finalizing.' });
    }

    const at = endInstant(period.periodEnd);
    const rule = await this.rules.getEffectiveRule(RevenueSourceType.MEMBERSHIP_POOL, at, runner instanceof EntityManager ? runner : undefined);
    const taxConfig = await this.tax.getEffective(at, runner instanceof EntityManager ? runner : undefined);
    if (rule.id !== latest.revenueRuleId || taxConfig.id !== latest.taxConfigId) {
      stale = true;
      blockers.push({ code: 'STALE_RULES', message: 'The revenue rule or tax setting changed after this calculation. Recalculate before finalizing.' });
    }

    const requiresUndistributedAck = toPaise(latest.undistributedAmount) > 0n;
    return { blockers, stale, requiresUndistributedAck };
  }
}