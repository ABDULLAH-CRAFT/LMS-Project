import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionPayments1790985600000 implements MigrationInterface {
  name = 'CreateSubscriptionPayments1790985600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ───────── subscription_payments: one row per PAID month (append-only) ─────────
    await queryRunner.query(`
      CREATE TABLE "subscription_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subscriptionId" uuid NOT NULL,
        "paymentId" uuid NOT NULL,
        "paymentItemId" uuid NOT NULL,
        "periodStart" TIMESTAMP WITH TIME ZONE NOT NULL,
        "periodEnd" TIMESTAMP WITH TIME ZONE NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'INR',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscription_payments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscription_payments_item" UNIQUE ("paymentItemId"),
        CONSTRAINT "CHK_subscription_payments_amount" CHECK ("amount" > 0),
        CONSTRAINT "CHK_subscription_payments_period" CHECK ("periodEnd" > "periodStart"),
        CONSTRAINT "FK_subscription_payments_sub" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_subscription_payments_payment" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_subscription_payments_item" FOREIGN KEY ("paymentItemId") REFERENCES "payment_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_subscription_payments_sub" ON "subscription_payments" ("subscriptionId")`);
    await queryRunner.query(`CREATE INDEX "IDX_subscription_payments_payment" ON "subscription_payments" ("paymentId")`);

    // Reuses the append-only guard function from the R1 migration.
    await queryRunner.query(
      `CREATE TRIGGER "trg_subscription_payments_append_only" BEFORE UPDATE OR DELETE ON "subscription_payments" FOR EACH ROW EXECUTE FUNCTION revenue_block_mutation()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "trg_subscription_payments_no_truncate" BEFORE TRUNCATE ON "subscription_payments" FOR EACH STATEMENT EXECUTE FUNCTION revenue_block_mutation()`,
    );

    // ───────── payment_settlements must now be able to settle membership payments ─────────
    // The R2 CHECK required revenueTransactionCount <= courseItemCount, which a membership-only payment violates.
    await queryRunner.query(`ALTER TABLE "payment_settlements" DROP CONSTRAINT "CHK_payment_settlements_counts"`);
    await queryRunner.query(`ALTER TABLE "payment_settlements" ADD COLUMN "membershipItemCount" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`
      ALTER TABLE "payment_settlements" ADD CONSTRAINT "CHK_payment_settlements_counts" CHECK (
        "courseItemCount" >= 0 AND "membershipItemCount" >= 0 AND "revenueTransactionCount" >= 0
        AND "revenueTransactionCount" <= "courseItemCount" + "membershipItemCount"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // NOTE: restoring the old CHECK fails if membership settlements already exist. Only revert on a database without them.
    await queryRunner.query(`ALTER TABLE "payment_settlements" DROP CONSTRAINT "CHK_payment_settlements_counts"`);
    await queryRunner.query(`ALTER TABLE "payment_settlements" DROP COLUMN "membershipItemCount"`);
    await queryRunner.query(`
      ALTER TABLE "payment_settlements" ADD CONSTRAINT "CHK_payment_settlements_counts" CHECK (
        "courseItemCount" >= 0 AND "revenueTransactionCount" >= 0 AND "revenueTransactionCount" <= "courseItemCount"
      )
    `);
    await queryRunner.query(`DROP TABLE "subscription_payments"`);
  }
}