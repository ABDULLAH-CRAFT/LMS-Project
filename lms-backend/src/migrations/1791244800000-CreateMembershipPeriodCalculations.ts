import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMembershipPeriodCalculations1791244800000 implements MigrationInterface {
  name = 'CreateMembershipPeriodCalculations1791244800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ───────── membership_tax_configs: effective-dated, append-only ─────────
    // taxRateBps = tax rate (e.g. GST) that is ALREADY INCLUDED in the membership price (1800 = 18%).
    // Default 0 until the business has confirmed the treatment with its accountant.
    await queryRunner.query(`
      CREATE TABLE "membership_tax_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "taxRateBps" integer NOT NULL,
        "effectiveFrom" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdById" uuid,
        "note" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_membership_tax_configs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_membership_tax_configs_effective" UNIQUE ("effectiveFrom"),
        CONSTRAINT "CHK_membership_tax_configs_rate" CHECK ("taxRateBps" BETWEEN 0 AND 10000),
        CONSTRAINT "FK_membership_tax_configs_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      INSERT INTO "membership_tax_configs" ("taxRateBps", "effectiveFrom", "note")
      VALUES (0, '2000-01-01T00:00:00Z', 'Initial: no tax deducted (confirm with your CA before launch)')
    `);

    // ───────── revenue_period_calculations: one FROZEN calculation per run ─────────
    await queryRunner.query(`
      CREATE TABLE "revenue_period_calculations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "periodId" uuid NOT NULL,
        "runNumber" integer NOT NULL,
        "engagementRunId" uuid NOT NULL,
        "revenueRuleId" uuid NOT NULL,
        "taxConfigId" uuid NOT NULL,
        "platformPercentage" numeric(5,2) NOT NULL,
        "teacherPercentage" numeric(5,2) NOT NULL,
        "taxRateBps" integer NOT NULL,
        "paymentCount" integer NOT NULL,
        "reversalCount" integer NOT NULL,
        "grossRevenue" numeric(14,2) NOT NULL,
        "refundsAmount" numeric(14,2) NOT NULL,
        "taxAmount" numeric(14,2) NOT NULL,
        "eligibleRevenue" numeric(14,2) NOT NULL,
        "platformRevenue" numeric(14,2) NOT NULL,
        "teacherPool" numeric(14,2) NOT NULL,
        "distributedAmount" numeric(14,2) NOT NULL,
        "undistributedAmount" numeric(14,2) NOT NULL,
        "teacherCount" integer NOT NULL,
        "isPartialPeriod" boolean NOT NULL,
        "calculationVersion" integer NOT NULL DEFAULT 1,
        "calculatedById" uuid,
        "calculatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_revenue_period_calculations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_revenue_period_calculations_run" UNIQUE ("periodId", "runNumber"),
        CONSTRAINT "UQ_revenue_period_calculations_id_period" UNIQUE ("id", "periodId"),
        CONSTRAINT "CHK_revenue_period_calculations_run" CHECK ("runNumber" >= 1),
        CONSTRAINT "CHK_revenue_period_calculations_nonneg" CHECK (
          "grossRevenue" >= 0 AND "refundsAmount" >= 0 AND "taxAmount" >= 0 AND "eligibleRevenue" >= 0
          AND "platformRevenue" >= 0 AND "teacherPool" >= 0 AND "distributedAmount" >= 0 AND "undistributedAmount" >= 0
        ),
        CONSTRAINT "CHK_revenue_period_calculations_split" CHECK ("platformRevenue" + "teacherPool" = "eligibleRevenue"),
        CONSTRAINT "CHK_revenue_period_calculations_pool" CHECK ("distributedAmount" + "undistributedAmount" = "teacherPool"),
        CONSTRAINT "CHK_revenue_period_calculations_eligible" CHECK ("eligibleRevenue" <= "grossRevenue"),
        CONSTRAINT "FK_revenue_period_calculations_period" FOREIGN KEY ("periodId") REFERENCES "revenue_periods"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_revenue_period_calculations_engagement" FOREIGN KEY ("engagementRunId") REFERENCES "engagement_score_runs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_revenue_period_calculations_rule" FOREIGN KEY ("revenueRuleId") REFERENCES "revenue_rules"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_revenue_period_calculations_tax" FOREIGN KEY ("taxConfigId") REFERENCES "membership_tax_configs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_revenue_period_calculations_by" FOREIGN KEY ("calculatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_revenue_period_calculations_period" ON "revenue_period_calculations" ("periodId")`);

    // ───────── membership_period_allocations: each teacher's frozen rupee share ─────────
    await queryRunner.query(`
      CREATE TABLE "membership_period_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "calculationId" uuid NOT NULL,
        "periodId" uuid NOT NULL,
        "teacherId" uuid NOT NULL,
        "engagementScoreId" uuid NOT NULL,
        "finalScore" bigint NOT NULL,
        "poolSharePpm" integer NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_membership_period_allocations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_membership_period_allocations_teacher" UNIQUE ("calculationId", "teacherId"),
        CONSTRAINT "CHK_membership_period_allocations_amount" CHECK ("amount" >= 0),
        CONSTRAINT "CHK_membership_period_allocations_share" CHECK ("poolSharePpm" BETWEEN 0 AND 1000000),
        CONSTRAINT "FK_membership_period_allocations_calc" FOREIGN KEY ("calculationId", "periodId")
          REFERENCES "revenue_period_calculations"("id", "periodId") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_membership_period_allocations_teacher" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_membership_period_allocations_score" FOREIGN KEY ("engagementScoreId") REFERENCES "engagement_scores"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_membership_period_allocations_teacher" ON "membership_period_allocations" ("teacherId")`);
    await queryRunner.query(`CREATE INDEX "IDX_membership_period_allocations_period" ON "membership_period_allocations" ("periodId")`);

    // Append-only (reuses the R1 guard function). A recalculation is a NEW run, never an edit.
    for (const table of ['membership_tax_configs', 'revenue_period_calculations', 'membership_period_allocations']) {
      await queryRunner.query(
        `CREATE TRIGGER "trg_${table}_append_only" BEFORE UPDATE OR DELETE ON "${table}" FOR EACH ROW EXECUTE FUNCTION revenue_block_mutation()`,
      );
      await queryRunner.query(
        `CREATE TRIGGER "trg_${table}_no_truncate" BEFORE TRUNCATE ON "${table}" FOR EACH STATEMENT EXECUTE FUNCTION revenue_block_mutation()`,
      );
    }

    // ───────── revenue_periods: link to the frozen calculation ─────────
    await queryRunner.query(`ALTER TABLE "revenue_periods" ADD COLUMN "finalCalculationId" uuid`);
    // Composite FK: the final calculation must belong to THIS period.
    await queryRunner.query(`
      ALTER TABLE "revenue_periods" ADD CONSTRAINT "FK_revenue_periods_final_calc"
        FOREIGN KEY ("finalCalculationId", "id") REFERENCES "revenue_period_calculations"("id", "periodId") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "revenue_periods" ADD CONSTRAINT "CHK_revenue_periods_final_calc" CHECK (
        "status" NOT IN ('FINALIZED','PAYOUT_PROCESSING','PAID') OR "finalCalculationId" IS NOT NULL
      )
    `);

    // ───────── guard: finalization must match the frozen calculation exactly ─────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION revenue_periods_guard() RETURNS trigger AS $$
      DECLARE
        c record;
        v_sum numeric;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'revenue_periods rows cannot be deleted' USING ERRCODE = 'restrict_violation';
        END IF;

        IF OLD."status" IN ('FINALIZED','PAYOUT_PROCESSING','PAID') THEN
          IF NEW."periodStart" IS DISTINCT FROM OLD."periodStart"
             OR NEW."periodEnd" IS DISTINCT FROM OLD."periodEnd"
             OR NEW."grossRevenue" IS DISTINCT FROM OLD."grossRevenue"
             OR NEW."eligibleRevenue" IS DISTINCT FROM OLD."eligibleRevenue"
             OR NEW."platformRevenue" IS DISTINCT FROM OLD."platformRevenue"
             OR NEW."teacherPool" IS DISTINCT FROM OLD."teacherPool"
             OR NEW."finalizedAt" IS DISTINCT FROM OLD."finalizedAt"
             OR NEW."finalizedById" IS DISTINCT FROM OLD."finalizedById"
             OR NEW."finalCalculationId" IS DISTINCT FROM OLD."finalCalculationId" THEN
            RAISE EXCEPTION 'Revenue period % is finalized and frozen. Post an adjustment instead.', OLD."id"
              USING ERRCODE = 'restrict_violation';
          END IF;

          IF NOT (
            (OLD."status" = 'FINALIZED' AND NEW."status" IN ('FINALIZED','PAYOUT_PROCESSING'))
            OR (OLD."status" = 'PAYOUT_PROCESSING' AND NEW."status" IN ('PAYOUT_PROCESSING','PAID'))
            OR (OLD."status" = 'PAID' AND NEW."status" = 'PAID')
          ) THEN
            RAISE EXCEPTION 'Revenue period % status cannot move from % to %', OLD."id", OLD."status", NEW."status"
              USING ERRCODE = 'restrict_violation';
          END IF;
        ELSE
          IF NEW."status" IN ('PAYOUT_PROCESSING','PAID') THEN
            RAISE EXCEPTION 'Revenue period % must be FINALIZED before payout processing', OLD."id"
              USING ERRCODE = 'restrict_violation';
          END IF;

          IF NEW."status" = 'FINALIZED' THEN
            IF OLD."status" <> 'CALCULATED' THEN
              RAISE EXCEPTION 'Revenue period % can only be finalized from CALCULATED (it is %)', OLD."id", OLD."status"
                USING ERRCODE = 'restrict_violation';
            END IF;

            SELECT * INTO c FROM "revenue_period_calculations"
             WHERE "id" = NEW."finalCalculationId" AND "periodId" = NEW."id";
            IF NOT FOUND THEN
              RAISE EXCEPTION 'Revenue period % has no matching frozen calculation', NEW."id"
                USING ERRCODE = 'restrict_violation';
            END IF;

            IF NEW."grossRevenue" <> c."grossRevenue"
               OR NEW."eligibleRevenue" <> c."eligibleRevenue"
               OR NEW."platformRevenue" <> c."platformRevenue"
               OR NEW."teacherPool" <> c."teacherPool" THEN
              RAISE EXCEPTION 'Revenue period % amounts do not match its frozen calculation', NEW."id"
                USING ERRCODE = 'restrict_violation';
            END IF;

            SELECT COALESCE(SUM("amount"), 0) INTO v_sum
              FROM "membership_period_allocations" WHERE "calculationId" = c."id";
            IF v_sum <> c."distributedAmount" THEN
              RAISE EXCEPTION 'Teacher allocations (%) do not match the calculation distributed amount (%)', v_sum, c."distributedAmount"
                USING ERRCODE = 'restrict_violation';
            END IF;
          ELSIF NEW."finalCalculationId" IS NOT NULL THEN
            RAISE EXCEPTION 'finalCalculationId can only be set when a period is finalized'
              USING ERRCODE = 'restrict_violation';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // ───────── guard: nothing may be posted into a finalized period ─────────
    // (the app rolls such postings into the next OPEN period; this catches the rare race)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION revenue_tx_period_guard() RETURNS trigger AS $$
      DECLARE
        v_status text;
      BEGIN
        IF NEW."periodId" IS NULL THEN
          RETURN NEW;
        END IF;
        SELECT "status"::text INTO v_status FROM "revenue_periods" WHERE "id" = NEW."periodId";
        IF v_status IN ('FINALIZED','PAYOUT_PROCESSING','PAID') THEN
          RAISE EXCEPTION 'Revenue period % is finalized: post this transaction into the next open period', NEW."periodId"
            USING ERRCODE = 'restrict_violation';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(
      `CREATE TRIGGER "trg_revenue_transactions_period_guard" BEFORE INSERT ON "revenue_transactions" FOR EACH ROW EXECUTE FUNCTION revenue_tx_period_guard()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_revenue_transactions_period_guard" ON "revenue_transactions"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS revenue_tx_period_guard()`);

    // Restore the R1 version of the period guard.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION revenue_periods_guard() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'revenue_periods rows cannot be deleted' USING ERRCODE = 'restrict_violation';
        END IF;

        IF OLD."status" IN ('FINALIZED','PAYOUT_PROCESSING','PAID') THEN
          IF NEW."periodStart" IS DISTINCT FROM OLD."periodStart"
             OR NEW."periodEnd" IS DISTINCT FROM OLD."periodEnd"
             OR NEW."grossRevenue" IS DISTINCT FROM OLD."grossRevenue"
             OR NEW."eligibleRevenue" IS DISTINCT FROM OLD."eligibleRevenue"
             OR NEW."platformRevenue" IS DISTINCT FROM OLD."platformRevenue"
             OR NEW."teacherPool" IS DISTINCT FROM OLD."teacherPool"
             OR NEW."finalizedAt" IS DISTINCT FROM OLD."finalizedAt"
             OR NEW."finalizedById" IS DISTINCT FROM OLD."finalizedById" THEN
            RAISE EXCEPTION 'Revenue period % is finalized and frozen. Post an adjustment instead.', OLD."id"
              USING ERRCODE = 'restrict_violation';
          END IF;

          IF NOT (
            (OLD."status" = 'FINALIZED' AND NEW."status" IN ('FINALIZED','PAYOUT_PROCESSING'))
            OR (OLD."status" = 'PAYOUT_PROCESSING' AND NEW."status" IN ('PAYOUT_PROCESSING','PAID'))
            OR (OLD."status" = 'PAID' AND NEW."status" = 'PAID')
          ) THEN
            RAISE EXCEPTION 'Revenue period % status cannot move from % to %', OLD."id", OLD."status", NEW."status"
              USING ERRCODE = 'restrict_violation';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // NOTE: only revert on a database where no period has been finalized through R10.
    await queryRunner.query(`ALTER TABLE "revenue_periods" DROP CONSTRAINT "CHK_revenue_periods_final_calc"`);
    await queryRunner.query(`ALTER TABLE "revenue_periods" DROP CONSTRAINT "FK_revenue_periods_final_calc"`);
    await queryRunner.query(`ALTER TABLE "revenue_periods" DROP COLUMN "finalCalculationId"`);
    await queryRunner.query(`DROP TABLE "membership_period_allocations"`);
    await queryRunner.query(`DROP TABLE "revenue_period_calculations"`);
    await queryRunner.query(`DROP TABLE "membership_tax_configs"`);
  }
}