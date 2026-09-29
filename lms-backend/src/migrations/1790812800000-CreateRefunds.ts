import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefunds1790812800000 implements MigrationInterface {
  name = 'CreateRefunds1790812800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refunds" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "providerRefundId" character varying(191) NOT NULL,
        "kind" character varying(16) NOT NULL,
        "source" character varying(16) NOT NULL,
        "paymentId" uuid NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'INR',
        "reason" text,
        "initiatedById" uuid,
        "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refunds" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refunds_provider_refund" UNIQUE ("providerRefundId"),
        CONSTRAINT "CHK_refunds_kind" CHECK ("kind" IN ('REFUND','CHARGEBACK')),
        CONSTRAINT "CHK_refunds_source" CHECK ("source" IN ('ADMIN','WEBHOOK')),
        CONSTRAINT "CHK_refunds_amount" CHECK ("amount" > 0),
        CONSTRAINT "FK_refunds_payment" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_refunds_initiatedBy" FOREIGN KEY ("initiatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_refunds_paymentId" ON "refunds" ("paymentId")`);

    await queryRunner.query(`
      CREATE TABLE "refund_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "refundId" uuid NOT NULL,
        "paymentItemId" uuid NOT NULL,
        "revenueTransactionId" uuid NOT NULL,
        "reversalTransactionId" uuid NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "accessRevoked" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refund_items" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refund_items_refund_item" UNIQUE ("refundId", "paymentItemId"),
        CONSTRAINT "CHK_refund_items_amount" CHECK ("amount" > 0),
        CONSTRAINT "FK_refund_items_refund" FOREIGN KEY ("refundId") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_refund_items_payment_item" FOREIGN KEY ("paymentItemId") REFERENCES "payment_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_refund_items_original_tx" FOREIGN KEY ("revenueTransactionId") REFERENCES "revenue_transactions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_refund_items_reversal_tx" FOREIGN KEY ("reversalTransactionId") REFERENCES "revenue_transactions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_refund_items_paymentItemId" ON "refund_items" ("paymentItemId")`);
    await queryRunner.query(`CREATE INDEX "IDX_refund_items_reversalTx" ON "refund_items" ("reversalTransactionId")`);

    // Reuses the append-only guard function created in the R1 migration.
    for (const table of ['refunds', 'refund_items']) {
      await queryRunner.query(
        `CREATE TRIGGER "trg_${table}_append_only" BEFORE UPDATE OR DELETE ON "${table}" FOR EACH ROW EXECUTE FUNCTION revenue_block_mutation()`,
      );
      await queryRunner.query(
        `CREATE TRIGGER "trg_${table}_no_truncate" BEFORE TRUNCATE ON "${table}" FOR EACH STATEMENT EXECUTE FUNCTION revenue_block_mutation()`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refund_items"`);
    await queryRunner.query(`DROP TABLE "refunds"`);
  }
}
