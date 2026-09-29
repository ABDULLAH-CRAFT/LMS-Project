import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFinancialFoundation1790640000000 implements MigrationInterface {
  name = 'CreateFinancialFoundation1790640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ───────── enums ─────────
    await queryRunner.query(
      `CREATE TYPE "revenue_transaction_type" AS ENUM ('COURSE_PURCHASE','MEMBERSHIP_PAYMENT','REFUND','CHARGEBACK','ADJUSTMENT')`,
    );
    await queryRunner.query(`CREATE TYPE "revenue_transaction_status" AS ENUM ('POSTED')`);
    await queryRunner.query(`CREATE TYPE "revenue_recipient_type" AS ENUM ('PLATFORM','TEACHER')`);
    await queryRunner.query(`CREATE TYPE "revenue_source_type" AS ENUM ('COURSE_PURCHASE','MEMBERSHIP_POOL')`);
    await queryRunner.query(
      `CREATE TYPE "revenue_period_status" AS ENUM ('OPEN','CALCULATING','CALCULATED','FINALIZED','PAYOUT_PROCESSING','PAID')`,
    );

    // ───────── revenue_rules (effective-dated, append-only) ─────────
    await queryRunner.query(`
      CREATE TABLE "revenue_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sourceType" "revenue_source_type" NOT NULL,
        "platformPercentage" numeric(5,2) NOT NULL,
        "teacherPercentage" numeric(5,2) NOT NULL,
        "effectiveFrom" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdById" uuid,
        "note" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_revenue_rules" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_revenue_rules_source_effective" UNIQUE ("sourceType", "effectiveFrom"),
        CONSTRAINT "CHK_revenue_rules_percentages" CHECK (
          "platformPercentage" >= 0 AND "teacherPercentage" >= 0
          AND "platformPercentage" + "teacherPercentage" = 100
        ),
        CONSTRAINT "FK_revenue_rules_createdBy" FOREIGN KEY ("createdById")
          REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      INSERT INTO "revenue_rules" ("sourceType", "platformPercentage", "teacherPercentage", "effectiveFrom", "note")
      VALUES
        ('COURSE_PURCHASE', 30.00, 70.00, '2000-01-01T00:00:00Z', 'Initial rule: 30% platform / 70% teacher'),
        ('MEMBERSHIP_POOL', 30.00, 70.00, '2000-01-01T00:00:00Z', 'Initial rule: 30% platform / 70% teacher pool')
    `);

    // ───────── revenue_periods ─────────
    await queryRunner.query(`
      CREATE TABLE "revenue_periods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "status" "revenue_period_status" NOT NULL DEFAULT 'OPEN',
        "grossRevenue" numeric(14,2) NOT NULL DEFAULT 0,
        "eligibleRevenue" numeric(14,2) NOT NULL DEFAULT 0,
        "platformRevenue" numeric(14,2) NOT NULL DEFAULT 0,
        "teacherPool" numeric(14,2) NOT NULL DEFAULT 0,
        "finalizedAt" TIMESTAMP WITH TIME ZONE,
        "finalizedById" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_revenue_periods" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_revenue_periods_range" UNIQUE ("periodStart", "periodEnd"),
        CONSTRAINT "CHK_revenue_periods_range" CHECK ("periodEnd" >= "periodStart"),
        CONSTRAINT "CHK_revenue_periods_finalized" CHECK (
          "status" NOT IN ('FINALIZED','PAYOUT_PROCESSING','PAID') OR "finalizedAt" IS NOT NULL
        ),
        CONSTRAINT "FK_revenue_periods_finalizedBy" FOREIGN KEY ("finalizedById")
          REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    // ───────── revenue_transactions (append-only) ─────────
    await queryRunner.query(`
      CREATE TABLE "revenue_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "idempotencyKey" character varying(191) NOT NULL,
        "transactionType" "revenue_transaction_type" NOT NULL,
        "status" "revenue_transaction_status" NOT NULL DEFAULT 'POSTED',
        "amount" numeric(14,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'INR',
        "paymentId" uuid,
        "paymentItemId" uuid,
        "courseId" uuid,
        "studentId" uuid,
        "periodId" uuid,
        "reversesTransactionId" uuid,
        "revenueRuleId" uuid,
        "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_revenue_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rev_tx_idempotency" UNIQUE ("idempotencyKey"),
        CONSTRAINT "CHK_rev_tx_amount_sign" CHECK (
          ("transactionType" IN ('COURSE_PURCHASE','MEMBERSHIP_PAYMENT') AND "amount" > 0)
          OR ("transactionType" IN ('REFUND','CHARGEBACK') AND "amount" < 0 AND "reversesTransactionId" IS NOT NULL)
          OR ("transactionType" = 'ADJUSTMENT' AND "amount" <> 0)
        ),
        CONSTRAINT "FK_rev_tx_payment" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_rev_tx_payment_item" FOREIGN KEY ("paymentItemId") REFERENCES "payment_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_rev_tx_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_rev_tx_student" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_rev_tx_period" FOREIGN KEY ("periodId") REFERENCES "revenue_periods"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_rev_tx_reverses" FOREIGN KEY ("reversesTransactionId") REFERENCES "revenue_transactions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_rev_tx_rule" FOREIGN KEY ("revenueRuleId") REFERENCES "revenue_rules"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_rev_tx_paymentId" ON "revenue_transactions" ("paymentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_rev_tx_paymentItemId" ON "revenue_transactions" ("paymentItemId")`);
    await queryRunner.query(`CREATE INDEX "IDX_rev_tx_courseId" ON "revenue_transactions" ("courseId")`);
    await queryRunner.query(`CREATE INDEX "IDX_rev_tx_studentId" ON "revenue_transactions" ("studentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_rev_tx_periodId" ON "revenue_transactions" ("periodId")`);
    await queryRunner.query(`CREATE INDEX "IDX_rev_tx_reverses" ON "revenue_transactions" ("reversesTransactionId")`);
    await queryRunner.query(`CREATE INDEX "IDX_rev_tx_occurredAt" ON "revenue_transactions" ("occurredAt")`);
    // Belt and braces on top of the idempotency key: a payment item can be purchased ONCE.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_rev_tx_course_purchase_item" ON "revenue_transactions" ("paymentItemId") WHERE "transactionType" = 'COURSE_PURCHASE'`,
    );

    // ───────── revenue_allocations (append-only) ─────────
    await queryRunner.query(`
      CREATE TABLE "revenue_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "revenueTransactionId" uuid NOT NULL,
        "recipientType" "revenue_recipient_type" NOT NULL,
        "recipientId" uuid,
        "percentage" numeric(5,2) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "sourceType" "revenue_source_type" NOT NULL,
        "sourceId" uuid NOT NULL,
        "calculationVersion" integer NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_revenue_allocations" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_rev_alloc_recipient" CHECK (
          ("recipientType" = 'PLATFORM' AND "recipientId" IS NULL)
          OR ("recipientType" = 'TEACHER' AND "recipientId" IS NOT NULL)
        ),
        CONSTRAINT "CHK_rev_alloc_percentage" CHECK ("percentage" >= 0 AND "percentage" <= 100),
        CONSTRAINT "FK_rev_alloc_tx" FOREIGN KEY ("revenueTransactionId") REFERENCES "revenue_transactions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_rev_alloc_recipient" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_rev_alloc_tx" ON "revenue_allocations" ("revenueTransactionId")`);
    await queryRunner.query(`CREATE INDEX "IDX_rev_alloc_recipient" ON "revenue_allocations" ("recipientId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_rev_alloc_source" ON "revenue_allocations" ("sourceId")`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_rev_alloc_platform_per_tx" ON "revenue_allocations" ("revenueTransactionId") WHERE "recipientType" = 'PLATFORM'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_rev_alloc_teacher_per_tx" ON "revenue_allocations" ("revenueTransactionId", "recipientId") WHERE "recipientType" = 'TEACHER'`,
    );

    // ───────── guard: append-only ─────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION revenue_block_mutation() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Financial records are append-only: % on "%" is not allowed. Post a reversal/adjustment instead.',
          TG_OP, TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);
    for (const table of ['revenue_transactions', 'revenue_allocations', 'revenue_rules']) {
      await queryRunner.query(
        `CREATE TRIGGER "trg_${table}_append_only" BEFORE UPDATE OR DELETE ON "${table}" FOR EACH ROW EXECUTE FUNCTION revenue_block_mutation()`,
      );
      await queryRunner.query(
        `CREATE TRIGGER "trg_${table}_no_truncate" BEFORE TRUNCATE ON "${table}" FOR EACH STATEMENT EXECUTE FUNCTION revenue_block_mutation()`,
      );
    }

    // ───────── guard: allocations must balance the transaction (checked at COMMIT) ─────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION revenue_assert_balanced() RETURNS trigger AS $$
      DECLARE
        v_tx_id uuid;
        v_amount numeric;
        v_type text;
        v_reverses uuid;
        v_sum numeric;
      BEGIN
        IF TG_TABLE_NAME = 'revenue_transactions' THEN
          v_tx_id := NEW."id";
        ELSE
          v_tx_id := NEW."revenueTransactionId";
        END IF;

        SELECT "amount", "transactionType"::text, "reversesTransactionId"
          INTO v_amount, v_type, v_reverses
          FROM "revenue_transactions" WHERE "id" = v_tx_id;

        -- Membership payments enter a pool and are split later (Phase R7/R10): no allocations at posting time.
        IF v_type = 'MEMBERSHIP_PAYMENT' THEN
          RETURN NULL;
        END IF;
        IF v_reverses IS NOT NULL AND
           (SELECT "transactionType"::text FROM "revenue_transactions" WHERE "id" = v_reverses) = 'MEMBERSHIP_PAYMENT' THEN
          RETURN NULL;
        END IF;

        SELECT COALESCE(SUM("amount"), 0) INTO v_sum
          FROM "revenue_allocations" WHERE "revenueTransactionId" = v_tx_id;

        IF v_sum <> v_amount THEN
          RAISE EXCEPTION 'Revenue allocations (%) do not balance transaction % amount (%)', v_sum, v_tx_id, v_amount;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE CONSTRAINT TRIGGER "trg_revenue_transactions_balanced"
      AFTER INSERT ON "revenue_transactions"
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION revenue_assert_balanced()
    `);
    await queryRunner.query(`
      CREATE CONSTRAINT TRIGGER "trg_revenue_allocations_balanced"
      AFTER INSERT ON "revenue_allocations"
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION revenue_assert_balanced()
    `);

    // ───────── guard: finalized periods are frozen ─────────
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
    await queryRunner.query(
      `CREATE TRIGGER "trg_revenue_periods_guard" BEFORE UPDATE OR DELETE ON "revenue_periods" FOR EACH ROW EXECUTE FUNCTION revenue_periods_guard()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "revenue_allocations"`);
    await queryRunner.query(`DROP TABLE "revenue_transactions"`);
    await queryRunner.query(`DROP TABLE "revenue_periods"`);
    await queryRunner.query(`DROP TABLE "revenue_rules"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS revenue_periods_guard()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS revenue_assert_balanced()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS revenue_block_mutation()`);
    await queryRunner.query(`DROP TYPE "revenue_period_status"`);
    await queryRunner.query(`DROP TYPE "revenue_source_type"`);
    await queryRunner.query(`DROP TYPE "revenue_recipient_type"`);
    await queryRunner.query(`DROP TYPE "revenue_transaction_status"`);
    await queryRunner.query(`DROP TYPE "revenue_transaction_type"`);
  }
}