import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { WeightsBps } from '../engagement/engagement-score.calculator';
import { fromPaise, toPaise } from './money.util';
import { buildCategoryBreakdown, formatFinalScore, ppmToPercent } from './teacher-membership.math';

type Row = Record<string, any>;

const IS_FINAL = `p."status"::text IN ('FINALIZED','PAYOUT_PROCESSING','PAID')`;

// One row per revenue period in which THIS teacher has a frozen membership allocation.
// - FINAL periods use the exact calculation the admin finalized (p.finalCalculationId).
// - Not-yet-final periods use the latest calculation and are only "provisional".
// $1 is ALWAYS the teacher id taken from the JWT.
const BASE_FROM = `
  FROM "revenue_periods" p
  JOIN LATERAL (
    SELECT x.* FROM "revenue_period_calculations" x
     WHERE x."periodId" = p."id" AND (p."finalCalculationId" IS NULL OR x."id" = p."finalCalculationId")
     ORDER BY x."runNumber" DESC LIMIT 1
  ) c ON true
  JOIN "membership_period_allocations" a ON a."calculationId" = c."id" AND a."teacherId" = $1::uuid
`;

@Injectable()
export class FinanceTeacherMembershipService {
  constructor(private readonly dataSource: DataSource) {}

  async getMembershipEarnings(teacherId: string, limit: number) {
    const rows: Row[] = await this.dataSource.query(
      `SELECT p."id" AS "periodId", p."periodStart"::text AS "periodStart", p."periodEnd"::text AS "periodEnd",
              p."status"::text AS "status", (${IS_FINAL}) AS "isFinal", p."finalizedAt",
              c."teacherPool"::text AS "teacherPool", c."isPartialPeriod", c."calculatedAt",
              a."amount"::text AS "amount", a."finalScore"::text AS "finalScore", a."poolSharePpm",
              s."lessonCompletions", s."courseCompletions", s."assessmentEvents", s."returningLearners", s."activeLearners",
              s."lessonScore"::text AS "lessonScore", s."courseCompletionScore"::text AS "courseCompletionScore",
              s."assessmentScore"::text AS "assessmentScore", s."returningLearnerScore"::text AS "returningLearnerScore",
              s."ratingScore"::text AS "ratingScore", r."weights" AS "weights"
         ${BASE_FROM}
         JOIN "engagement_scores" s ON s."id" = a."engagementScoreId"
         JOIN "engagement_score_runs" r ON r."id" = s."runId"
        ORDER BY p."periodStart" DESC
        LIMIT $2`,
      [teacherId, limit],
    );

    const [totals]: Row[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(a."amount") FILTER (WHERE ${IS_FINAL}), 0)::text AS "finalTotal",
              COALESCE(SUM(a."amount") FILTER (WHERE NOT (${IS_FINAL})), 0)::text AS "provisionalTotal",
              (COUNT(*) FILTER (WHERE ${IS_FINAL}))::int AS "finalPeriods"
         ${BASE_FROM}`,
      [teacherId],
    );

    const periods = rows.map((r) => {
      const weights: WeightsBps = {
        lessonCompletionBps: Number(r.weights.lessonCompletionBps),
        courseCompletionBps: Number(r.weights.courseCompletionBps),
        assessmentBps: Number(r.weights.assessmentBps),
        returningLearnerBps: Number(r.weights.returningLearnerBps),
        ratingBps: Number(r.weights.ratingBps),
      };
      return {
        periodId: r.periodId as string,
        periodStart: r.periodStart as string,
        periodEnd: r.periodEnd as string,
        status: r.status as string,
        state: (r.isFinal ? 'FINAL' : 'PROVISIONAL') as 'FINAL' | 'PROVISIONAL',
        isPartialPeriod: Boolean(r.isPartialPeriod),
        calculatedAt: r.calculatedAt as Date,
        finalizedAt: (r.finalizedAt as Date | null) ?? null,
        teacherPool: fromPaise(toPaise(r.teacherPool)), // the whole pool (one number, no other teacher's data)
        teacherPoolSharePercent: ppmToPercent(Number(r.poolSharePpm)),
        earnings: fromPaise(toPaise(r.amount)),
        finalScore: formatFinalScore(BigInt(r.finalScore)),
        metrics: {
          lessonCompletions: Number(r.lessonCompletions),
          courseCompletions: Number(r.courseCompletions),
          assessmentEvents: Number(r.assessmentEvents),
          returningLearners: Number(r.returningLearners),
          activeLearners: Number(r.activeLearners),
        },
        categories: buildCategoryBreakdown(
          {
            lessonScore: BigInt(r.lessonScore),
            courseCompletionScore: BigInt(r.courseCompletionScore),
            assessmentScore: BigInt(r.assessmentScore),
            returningLearnerScore: BigInt(r.returningLearnerScore),
            ratingScore: BigInt(r.ratingScore),
          },
          weights,
        ),
      };
    });

    return {
      currency: 'INR',
      summary: {
        finalizedEarnings: fromPaise(toPaise(totals.finalTotal)), // counted in the overview
        provisionalEarnings: fromPaise(toPaise(totals.provisionalTotal)), // NOT counted until the admin finalizes
        finalizedPeriods: Number(totals.finalPeriods),
      },
      periods,
    };
  }
}