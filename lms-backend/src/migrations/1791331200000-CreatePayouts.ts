import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayouts1791331200000 implements MigrationInterface {
  name = 'CreatePayouts1791331200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "payout_status" AS ENUM ('PENDING','APPROVED','PROCESSING','PAID','FAILED','REVERSED','REJECTED')`,
    );
    await queryRunner.query(`CREATE TYPE "payout_item_kind" AS ENUM ('COURSE_ALLOCATION','MEMBERSHIP_ALLOCATION')`);

    // ───────── payout_settings: effective-dated, append-only ─────────
    await queryRunner.query(`
      CREATE TABLE "payout_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "holdDays" integer NOT NULL,
        "minimumPayout" numeric(14,2) NOT NULL,
        "effectiveFrom" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdById" uuid,
        "note" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payout_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payout_settings_effective" UNIQUE ("effectiveFrom"),
        CONSTRAINT "CHK_payout_settings_hold" CHECK ("holdDays" BETWEEN 0 AND 365),
        CONSTRAINT "CHK_payout_settings_min" CHECK ("minimumPayout" >= 0),
        CONSTRAINT "FK_payout_settings_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      INSERT INTO "payout_settings" ("holdDays","minimumPayout","effectiveFrom","note")
      VALUES (7, 100.00, '2000-01-01T00:00:00Z', 'Initial: 7 day hold on course earnings, minimum payout 100.00')
    `);

    // ───────── payouts ─────────
    await queryRunner.query(`
      CREATE TABLE "payouts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "teacherId" uuid NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'INR',
        "status" "payout_status" NOT NULL DEFAULT 'PENDING',
        "periodId" uuid,
        "provider" character varying(30) NOT NULL DEFAULT 'MANUAL',
        "providerPayoutId" character varying(100),
        "settingsId" uuid NOT NULL,
        "itemCount" integer NOT NULL,
        "retryCount" integer NOT NULL DEFAULT 0,
        "requestedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "requestedById" uuid NOT NULL,
        "approvedAt" TIMESTAMP WITH TIME ZONE,
        "approvedById" uuid,
        "processingAt" TIMESTAMP WITH TIME ZONE,
        "processedAt" TIMESTAMP WITH TIME ZONE,
        "failedAt" TIMESTAMP WITH TIME ZONE,
        "failureReason" text,
        "rejectedAt" TIMESTAMP WITH TIME ZONE,
        "rejectedById" uuid,
        "rejectionReason" text,
        "reversedAt" TIMESTAMP WITH TIME ZONE,
        "reversedById" uuid,
        "reversalReason" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payouts" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_payouts_amount" CHECK ("amount" > 0),
        CONSTRAINT "CHK_payouts_items" CHECK ("itemCount" >= 1),
        CONSTRAINT "CHK_payouts_paid" CHECK ("status"::text <> 'PAID' OR ("processedAt" IS NOT NULL AND "providerPayoutId" IS NOT NULL)),
        CONSTRAINT "CHK_payouts_failed" CHECK ("status"::text <> 'FAILED' OR "failureReason" IS NOT NULL),
        CONSTRAINT "CHK_payouts_rejected" CHECK ("status"::text <> 'REJECTED' OR "rejectionReason" IS NOT NULL),
        CONSTRAINT "CHK_payouts_reversed" CHECK ("status"::text <> 'REVERSED' OR "reversalReason" IS NOT NULL),
        CONSTRAINT "FK_payouts_teacher" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_payouts_period" FOREIGN KEY ("periodId") REFERENCES "revenue_periods"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_payouts_settings" FOREIGN KEY ("settingsId") REFERENCES "payout_settings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_payouts_requestedBy" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_payouts_approvedBy" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_payouts_rejectedBy" FOREIGN KEY ("rejectedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_payouts_reversedBy" FOREIGN KEY ("reversedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_payouts_teacher" ON "payouts" ("teacherId")`);
    await queryRunner.query(`CREATE INDEX "IDX_payouts_status" ON "payouts" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_payouts_period" ON "payouts" ("periodId")`);
    // A teacher can have only ONE request waiting for approval.
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_payouts_one_pending_per_teacher" ON "payouts" ("teacherId") WHERE "status" = 'PENDING'`);
    // The same bank reference can never settle two payouts.
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_payouts_provider_ref" ON "payouts" ("providerPayoutId") WHERE "providerPayoutId" IS NOT NULL`);

    // ───────── payout_items: the exact ledger lines a payout settles ─────────
    await queryRunner.query(`
      CREATE TABLE "payout_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "payoutId" uuid NOT NULL,
        "sourceKind" "payout_item_kind" NOT NULL,
        "sourceId" uuid NOT NULL,
        "periodId" uuid,
        "amount" numeric(14,2) NOT NULL,
        "releasedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payout_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_payout_items_amount" CHECK ("amount" <> 0),
        CONSTRAINT "FK_payout_items_payout" FOREIGN KEY ("payoutId") REFERENCES "payouts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_payout_items_period" FOREIGN KEY ("periodId") REFERENCES "revenue_periods"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_payout_items_payout" ON "payout_items" ("payoutId")`);
    await queryRunner.query(`CREATE INDEX "IDX_payout_items_period" ON "payout_items" ("periodId")`);
    // THE double-payment guard: a ledger line can sit in only one unreleased payout.
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_payout_items_active_source" ON "payout_items" ("sourceKind","sourceId") WHERE "releasedAt" IS NULL`);

    // ───────── payout_events: append-only status history ─────────
    await queryRunner.query(`
      CREATE TABLE "payout_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "payoutId" uuid NOT NULL,
        "fromStatus" "payout_status",
        "toStatus" "payout_status" NOT NULL,
        "actorId" uuid,
        "actorRole" character varying(20) NOT NULL,
        "note" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payout_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payout_events_payout" FOREIGN KEY ("payoutId") REFERENCES "payouts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_payout_events_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_payout_events_payout" ON "payout_events" ("payoutId")`);

    // ───────── append-only tables (reuses the R1 guard function) ─────────
    for (const table of ['payout_settings', 'payout_events']) {
      await queryRunner.query(
        `CREATE TRIGGER "trg_${table}_append_only" BEFORE UPDATE OR DELETE ON "${table}" FOR EACH ROW EXECUTE FUNCTION revenue_block_mutation()`,
      );
    }
    for (const table of ['payout_settings', 'payout_events', 'payouts', 'payout_items']) {
      await queryRunner.query(
        `CREATE TRIGGER "trg_${table}_no_truncate" BEFORE TRUNCATE ON "${table}" FOR EACH STATEMENT EXECUTE FUNCTION revenue_block_mutation()`,
      );
    }

    // ───────── guard: payouts may only move along the allowed lifecycle ─────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION payouts_guard() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'payouts cannot be deleted' USING ERRCODE = 'restrict_violation';
        END IF;

        IF NEW."teacherId" IS DISTINCT FROM OLD."teacherId"
           OR NEW."amount" IS DISTINCT FROM OLD."amount"
           OR NEW."currency" IS DISTINCT FROM OLD."currency"
           OR NEW."requestedAt" IS DISTINCT FROM OLD."requestedAt"
           OR NEW."requestedById" IS DISTINCT FROM OLD."requestedById"
           OR NEW."settingsId" IS DISTINCT FROM OLD."settingsId"
           OR NEW."itemCount" IS DISTINCT FROM OLD."itemCount"
           OR NEW."periodId" IS DISTINCT FROM OLD."periodId" THEN
          RAISE EXCEPTION 'Payout % amount, owner and request details cannot be changed', OLD."id" USING ERRCODE = 'restrict_violation';
        END IF;

        IF OLD."status"::text IN ('REJECTED','REVERSED') THEN
          RAISE EXCEPTION 'Payout % is % and cannot change any more', OLD."id", OLD."status" USING ERRCODE = 'restrict_violation';
        END IF;

        IF NEW."status"::text <> OLD."status"::text THEN
          IF NOT (
            (OLD."status"::text = 'PENDING' AND NEW."status"::text IN ('APPROVED','REJECTED'))
            OR (OLD."status"::text = 'APPROVED' AND NEW."status"::text IN ('PROCESSING','REJECTED'))
            OR (OLD."status"::text = 'PROCESSING' AND NEW."status"::text IN ('PAID','FAILED'))
            OR (OLD."status"::text = 'FAILED' AND NEW."status"::text IN ('PROCESSING','REJECTED'))
            OR (OLD."status"::text = 'PAID' AND NEW."status"::text = 'REVERSED')
          ) THEN
            RAISE EXCEPTION 'Payout % cannot move from % to %', OLD."id", OLD."status", NEW."status" USING ERRCODE = 'restrict_violation';
          END IF;
        ELSIF OLD."status"::text = 'PAID' THEN
          IF NEW."providerPayoutId" IS DISTINCT FROM OLD."providerPayoutId" OR NEW."processedAt" IS DISTINCT FROM OLD."processedAt" THEN
            RAISE EXCEPTION 'Payout % is PAID; its bank reference cannot change', OLD."id" USING ERRCODE = 'restrict_violation';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`CREATE TRIGGER "trg_payouts_guard" BEFORE UPDATE OR DELETE ON "payouts" FOR EACH ROW EXECUTE FUNCTION payouts_guard()`);

    // ───────── guard: items never change, except being released once ─────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION payout_items_guard() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'payout_items cannot be deleted' USING ERRCODE = 'restrict_violation';
        END IF;
        IF NEW."payoutId" IS DISTINCT FROM OLD."payoutId"
           OR NEW."sourceKind" IS DISTINCT FROM OLD."sourceKind"
           OR NEW."sourceId" IS DISTINCT FROM OLD."sourceId"
           OR NEW."periodId" IS DISTINCT FROM OLD."periodId"
           OR NEW."amount" IS DISTINCT FROM OLD."amount" THEN
          RAISE EXCEPTION 'payout_items are append-only; only releasedAt can be set' USING ERRCODE = 'restrict_violation';
        END IF;
        IF OLD."releasedAt" IS NOT NULL AND NEW."releasedAt" IS DISTINCT FROM OLD."releasedAt" THEN
          RAISE EXCEPTION 'payout item is already released' USING ERRCODE = 'restrict_violation';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`CREATE TRIGGER "trg_payout_items_guard" BEFORE UPDATE OR DELETE ON "payout_items" FOR EACH ROW EXECUTE FUNCTION payout_items_guard()`);

    // ───────── guard: the items must add up to the payout amount (checked at COMMIT) ─────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION payouts_assert_items_balanced() RETURNS trigger AS $$
      DECLARE
        v_id uuid;
        v_amount numeric;
        v_sum numeric;
      BEGIN
        IF TG_TABLE_NAME = 'payouts' THEN
          v_id := NEW."id";
        ELSE
          v_id := NEW."payoutId";
        END IF;
        SELECT "amount" INTO v_amount FROM "payouts" WHERE "id" = v_id;
        SELECT COALESCE(SUM("amount"), 0) INTO v_sum FROM "payout_items" WHERE "payoutId" = v_id;
        IF v_amount IS NOT NULL AND v_sum <> v_amount THEN
          RAISE EXCEPTION 'Payout % items (%) do not add up to the payout amount (%)', v_id, v_sum, v_amount USING ERRCODE = 'restrict_violation';
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(
      `CREATE CONSTRAINT TRIGGER "trg_payouts_items_balanced" AFTER INSERT ON "payouts" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION payouts_assert_items_balanced()`,
    );
    await queryRunner.query(
      `CREATE CONSTRAINT TRIGGER "trg_payout_items_balanced" AFTER INSERT ON "payout_items" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION payouts_assert_items_balanced()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payout_events"`);
    await queryRunner.query(`DROP TABLE "payout_items"`);
    await queryRunner.query(`DROP TABLE "payouts"`);
    await queryRunner.query(`DROP TABLE "payout_settings"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS payouts_assert_items_balanced()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS payout_items_guard()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS payouts_guard()`);
    await queryRunner.query(`DROP TYPE "payout_item_kind"`);
    await queryRunner.query(`DROP TYPE "payout_status"`);
  }
}