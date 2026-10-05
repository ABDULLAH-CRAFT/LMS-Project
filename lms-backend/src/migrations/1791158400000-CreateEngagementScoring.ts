import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEngagementScoring1791158400000 implements MigrationInterface {
  name = 'CreateEngagementScoring1791158400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ───────── engagement_weight_configs: effective-dated, append-only ─────────
    await queryRunner.query(`
      CREATE TABLE "engagement_weight_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "lessonCompletionBps" integer NOT NULL,
        "courseCompletionBps" integer NOT NULL,
        "assessmentBps" integer NOT NULL,
        "returningLearnerBps" integer NOT NULL,
        "ratingBps" integer NOT NULL,
        "effectiveFrom" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdById" uuid,
        "note" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_engagement_weight_configs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_engagement_weight_configs_effective" UNIQUE ("effectiveFrom"),
        CONSTRAINT "CHK_engagement_weight_configs_range" CHECK (
          "lessonCompletionBps" BETWEEN 0 AND 10000 AND "courseCompletionBps" BETWEEN 0 AND 10000
          AND "assessmentBps" BETWEEN 0 AND 10000 AND "returningLearnerBps" BETWEEN 0 AND 10000
          AND "ratingBps" BETWEEN 0 AND 10000
        ),
        CONSTRAINT "CHK_engagement_weight_configs_sum" CHECK (
          "lessonCompletionBps" + "courseCompletionBps" + "assessmentBps" + "returningLearnerBps" + "ratingBps" = 10000
        ),
        CONSTRAINT "FK_engagement_weight_configs_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      INSERT INTO "engagement_weight_configs"
        ("lessonCompletionBps","courseCompletionBps","assessmentBps","returningLearnerBps","ratingBps","effectiveFrom","note")
      VALUES (4000,3000,1500,1000,500,'2000-01-01T00:00:00Z','Initial weights: 40/30/15/10/5')
    `);

    // ───────── engagement_score_runs: one frozen calculation per run ─────────
    await queryRunner.query(`
      CREATE TABLE "engagement_score_runs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "periodId" uuid NOT NULL,
        "runNumber" integer NOT NULL,
        "weightConfigId" uuid NOT NULL,
        "weights" jsonb NOT NULL,
        "parameters" jsonb NOT NULL,
        "isPartialPeriod" boolean NOT NULL,
        "teacherCount" integer NOT NULL,
        "totalScore" bigint NOT NULL,
        "calculatedById" uuid,
        "calculatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_engagement_score_runs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_engagement_score_runs_period_run" UNIQUE ("periodId","runNumber"),
        CONSTRAINT "CHK_engagement_score_runs_number" CHECK ("runNumber" >= 1),
        CONSTRAINT "FK_engagement_score_runs_period" FOREIGN KEY ("periodId") REFERENCES "revenue_periods"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_engagement_score_runs_weights" FOREIGN KEY ("weightConfigId") REFERENCES "engagement_weight_configs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_engagement_score_runs_by" FOREIGN KEY ("calculatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_engagement_score_runs_period" ON "engagement_score_runs" ("periodId")`);

    // ───────── engagement_scores: one row per teacher per run ─────────
    await queryRunner.query(`
      CREATE TABLE "engagement_scores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "runId" uuid NOT NULL,
        "teacherId" uuid NOT NULL,
        "lessonCompletions" integer NOT NULL,
        "courseCompletions" integer NOT NULL,
        "assessmentEvents" integer NOT NULL,
        "returningLearners" integer NOT NULL,
        "ratingSum" integer NOT NULL,
        "activeLearners" integer NOT NULL,
        "lessonScore" bigint NOT NULL,
        "courseCompletionScore" bigint NOT NULL,
        "assessmentScore" bigint NOT NULL,
        "returningLearnerScore" bigint NOT NULL,
        "ratingScore" bigint NOT NULL,
        "finalScore" bigint NOT NULL,
        "poolSharePpm" integer NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_engagement_scores" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_engagement_scores_run_teacher" UNIQUE ("runId","teacherId"),
        CONSTRAINT "CHK_engagement_scores_share" CHECK ("poolSharePpm" BETWEEN 0 AND 1000000),
        CONSTRAINT "CHK_engagement_scores_nonneg" CHECK (
          "lessonCompletions" >= 0 AND "courseCompletions" >= 0 AND "assessmentEvents" >= 0
          AND "returningLearners" >= 0 AND "ratingSum" >= 0 AND "activeLearners" >= 0 AND "finalScore" >= 0
        ),
        CONSTRAINT "FK_engagement_scores_run" FOREIGN KEY ("runId") REFERENCES "engagement_score_runs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_engagement_scores_teacher" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_engagement_scores_teacher" ON "engagement_scores" ("teacherId")`);

    // Append-only (reuses the R1 guard function). A recalculation is a NEW run, never an edit.
    for (const table of ['engagement_weight_configs', 'engagement_score_runs', 'engagement_scores']) {
      await queryRunner.query(
        `CREATE TRIGGER "trg_${table}_append_only" BEFORE UPDATE OR DELETE ON "${table}" FOR EACH ROW EXECUTE FUNCTION revenue_block_mutation()`,
      );
      await queryRunner.query(
        `CREATE TRIGGER "trg_${table}_no_truncate" BEFORE TRUNCATE ON "${table}" FOR EACH STATEMENT EXECUTE FUNCTION revenue_block_mutation()`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "engagement_scores"`);
    await queryRunner.query(`DROP TABLE "engagement_score_runs"`);
    await queryRunner.query(`DROP TABLE "engagement_weight_configs"`);
  }
}