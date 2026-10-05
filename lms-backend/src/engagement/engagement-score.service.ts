import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ENGAGEMENT_CONFIG } from './engagement.config';
import { calculateTeacherScores, RawTeacherMetrics, SCORE_SCALE, SHARE_SCALE } from './engagement-score.calculator';
import { EngagementWeightsService } from './engagement-weights.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCKED_STATUSES = new Set(['FINALIZED', 'PAYOUT_PROCESSING', 'PAID']);

// Raw metrics for ONE period: only trusted, points-earning events generated while the student
// had MEMBERSHIP access, inside the IST calendar month of the period.
const METRICS_SQL = `
  WITH p AS (
    SELECT ("periodStart"::timestamp AT TIME ZONE 'Asia/Kolkata') AS s,
           (("periodEnd" + 1)::timestamp AT TIME ZONE 'Asia/Kolkata') AS e
      FROM "revenue_periods" WHERE "id" = $1
  ),
  ev AS (
    SELECT x.* FROM "learning_activity_events" x, p
     WHERE x."accessVia" = 'MEMBERSHIP' AND x."points" > 0
       AND x."occurredAt" >= p.s AND x."occurredAt" < p.e
  ),
  agg AS (
    SELECT "teacherId",
           COUNT(*) FILTER (WHERE "eventType" = 'COURSE_COMPLETED')::int AS "courseCompletions",
           COUNT(*) FILTER (WHERE "eventType"::text = ANY($2::text[]))::int AS "assessmentEvents",
           COUNT(DISTINCT "studentId") FILTER (WHERE "eventType" = 'STUDENT_RETURNED')::int AS "returningLearners",
           COALESCE(SUM(CASE WHEN "eventType" = 'COURSE_RATED' AND ("metadata"->>'rating') ~ '^[1-5]$'
                             THEN ("metadata"->>'rating')::int END), 0)::int AS "ratingSum",
           COUNT(DISTINCT "studentId")::int AS "activeLearners"
      FROM ev GROUP BY "teacherId"
  ),
  lessons AS (
    SELECT "teacherId", SUM(LEAST(c, $3::int))::int AS "lessonCompletions"
      FROM (SELECT "teacherId", "studentId", COUNT(*) AS c FROM ev WHERE "eventType" = 'LESSON_COMPLETED' GROUP BY "teacherId", "studentId") q
     GROUP BY "teacherId"
  )
  SELECT a."teacherId", COALESCE(l."lessonCompletions", 0)::int AS "lessonCompletions",
         a."courseCompletions", a."assessmentEvents", a."returningLearners", a."ratingSum", a."activeLearners"
    FROM agg a LEFT JOIN lessons l ON l."teacherId" = a."teacherId"
   ORDER BY a."teacherId"
`;

@Injectable()
export class EngagementScoreService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly weights: EngagementWeightsService,
  ) {}

  /**
   * Calculates and FREEZES a score run for one revenue period.
   * - Never edits an earlier run: every recalculation is a new run (runNumber + 1).
   * - Refused once the period is FINALIZED / PAYOUT_PROCESSING / PAID.
   * - Row-locks the period so two admins cannot create the same runNumber.
   */
  async calculatePeriod(periodId: string, adminId: string) {
    if (!UUID_RE.test(periodId)) throw new BadRequestException('Invalid period id');

    const runId = await this.dataSource.transaction(async (manager: EntityManager) => {
      const periods: { id: string; periodStart: string; periodEnd: string; status: string; partial: boolean }[] = await manager.query(
        `SELECT "id", "periodStart"::text AS "periodStart", "periodEnd"::text AS "periodEnd", "status"::text AS "status",
                ("periodEnd" >= (now() AT TIME ZONE 'Asia/Kolkata')::date) AS "partial"
           FROM "revenue_periods" WHERE "id" = $1 FOR UPDATE`,
        [periodId],
      );
      const period = periods[0];
      if (!period) throw new NotFoundException('Revenue period not found');
      if (LOCKED_STATUSES.has(period.status)) {
        throw new ConflictException(`Period is ${period.status}; its calculation is frozen. Post an adjustment instead.`);
      }

      // One period = one weight set: the one in force at 00:00 IST on the period's first day.
      const periodStartInstant = new Date(`${period.periodStart}T00:00:00+05:30`);
      const weightConfig = await this.weights.getEffective(periodStartInstant, manager);
      const weights = {
        lessonCompletionBps: weightConfig.lessonCompletionBps,
        courseCompletionBps: weightConfig.courseCompletionBps,
        assessmentBps: weightConfig.assessmentBps,
        returningLearnerBps: weightConfig.returningLearnerBps,
        ratingBps: weightConfig.ratingBps,
      };

      const scoring = ENGAGEMENT_CONFIG.scoring;
      const metrics: RawTeacherMetrics[] = await manager.query(METRICS_SQL, [
        periodId,
        scoring.assessmentEventTypes,
        scoring.perLearnerLessonCap,
      ]);

      const scores = calculateTeacherScores(metrics, weights);
      const totalScore = scores.reduce((acc, s) => acc + s.finalScore, 0n);

      const next: { n: number }[] = await manager.query(
        `SELECT COALESCE(MAX("runNumber"), 0) + 1 AS "n" FROM "engagement_score_runs" WHERE "periodId" = $1`,
        [periodId],
      );

      const parameters = {
        membershipAccessOnly: true,
        countedEventsOnly: true,
        normalization: 'SHARE_OF_BEST_TEACHER',
        perLearnerLessonCap: scoring.perLearnerLessonCap,
        assessmentEventTypes: scoring.assessmentEventTypes,
        scoreScale: Number(SCORE_SCALE),
        shareScale: Number(SHARE_SCALE),
        periodTimezone: 'Asia/Kolkata',
      };

      const runs: { id: string }[] = await manager.query(
        `INSERT INTO "engagement_score_runs"
           ("periodId","runNumber","weightConfigId","weights","parameters","isPartialPeriod","teacherCount","totalScore","calculatedById")
         VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9) RETURNING "id"`,
        [
          periodId,
          next[0].n,
          weightConfig.id,
          JSON.stringify(weights),
          JSON.stringify(parameters),
          period.partial,
          scores.length,
          totalScore.toString(),
          adminId,
        ],
      );
      const id = runs[0].id;

      for (const s of scores) {
        await manager.query(
          `INSERT INTO "engagement_scores"
             ("runId","teacherId","lessonCompletions","courseCompletions","assessmentEvents","returningLearners","ratingSum","activeLearners",
              "lessonScore","courseCompletionScore","assessmentScore","returningLearnerScore","ratingScore","finalScore","poolSharePpm")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [
            id,
            s.teacherId,
            s.lessonCompletions,
            s.courseCompletions,
            s.assessmentEvents,
            s.returningLearners,
            s.ratingSum,
            s.activeLearners,
            s.lessonScore.toString(),
            s.courseCompletionScore.toString(),
            s.assessmentScore.toString(),
            s.returningLearnerScore.toString(),
            s.ratingScore.toString(),
            s.finalScore.toString(),
            s.poolSharePpm.toString(),
          ],
        );
      }
      return id;
    });

    return this.getRun(runId);
  }

  /** Periods that exist (created by membership payments) with their latest run, for the admin list. */
  listPeriods() {
    return this.dataSource.query(
      `SELECT p."id" AS "periodId", p."periodStart"::text AS "periodStart", p."periodEnd"::text AS "periodEnd", p."status"::text AS "status",
              r."id" AS "latestRunId", r."runNumber" AS "latestRunNumber", r."calculatedAt" AS "latestCalculatedAt",
              r."teacherCount" AS "teacherCount", r."isPartialPeriod" AS "isPartialPeriod",
              (SELECT COUNT(*)::int FROM "engagement_score_runs" x WHERE x."periodId" = p."id") AS "runCount"
         FROM "revenue_periods" p
         LEFT JOIN LATERAL (
           SELECT * FROM "engagement_score_runs" x WHERE x."periodId" = p."id" ORDER BY x."runNumber" DESC LIMIT 1
         ) r ON true
        ORDER BY p."periodStart" DESC`,
    );
  }

  async listRuns(periodId: string) {
    if (!UUID_RE.test(periodId)) throw new BadRequestException('Invalid period id');
    return this.dataSource.query(
      `SELECT r."id", r."runNumber", r."calculatedAt", r."teacherCount", r."isPartialPeriod", u."name" AS "calculatedByName"
         FROM "engagement_score_runs" r LEFT JOIN "users" u ON u."id" = r."calculatedById"
        WHERE r."periodId" = $1 ORDER BY r."runNumber" DESC`,
      [periodId],
    );
  }

  async getLatestRunForPeriod(periodId: string) {
    if (!UUID_RE.test(periodId)) throw new BadRequestException('Invalid period id');
    const rows: { id: string }[] = await this.dataSource.query(
      `SELECT "id" FROM "engagement_score_runs" WHERE "periodId" = $1 ORDER BY "runNumber" DESC LIMIT 1`,
      [periodId],
    );
    if (!rows[0]) throw new NotFoundException('No engagement calculation exists for this period yet');
    return this.getRun(rows[0].id);
  }

  /** One stored run, exactly as frozen. Nothing here is recalculated. */
  async getRun(runId: string) {
    if (!UUID_RE.test(runId)) throw new BadRequestException('Invalid run id');
    const runs = await this.dataSource.query(
      `SELECT r."id", r."periodId", r."runNumber", r."weights", r."parameters", r."isPartialPeriod", r."teacherCount",
              r."totalScore"::text AS "totalScore", r."calculatedAt", u."name" AS "calculatedByName",
              p."periodStart"::text AS "periodStart", p."periodEnd"::text AS "periodEnd", p."status"::text AS "periodStatus"
         FROM "engagement_score_runs" r
         JOIN "revenue_periods" p ON p."id" = r."periodId"
         LEFT JOIN "users" u ON u."id" = r."calculatedById"
        WHERE r."id" = $1`,
      [runId],
    );
    if (!runs[0]) throw new NotFoundException('Calculation run not found');

    const teachers = await this.dataSource.query(
      `SELECT s."teacherId", t."name" AS "teacherName",
              s."lessonCompletions", s."courseCompletions", s."assessmentEvents", s."returningLearners", s."ratingSum", s."activeLearners",
              s."lessonScore"::text AS "lessonScore", s."courseCompletionScore"::text AS "courseCompletionScore",
              s."assessmentScore"::text AS "assessmentScore", s."returningLearnerScore"::text AS "returningLearnerScore",
              s."ratingScore"::text AS "ratingScore", s."finalScore"::text AS "finalScore", s."poolSharePpm"
         FROM "engagement_scores" s JOIN "users" t ON t."id" = s."teacherId"
        WHERE s."runId" = $1
        ORDER BY s."finalScore" DESC, s."teacherId" ASC`,
      [runId],
    );

    return {
      ...runs[0],
      scoreScale: Number(SCORE_SCALE),
      shareScale: Number(SHARE_SCALE),
      teachers,
    };
  }
}