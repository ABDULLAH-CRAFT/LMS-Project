import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentSettlements1790726400000 implements MigrationInterface {
  name = 'CreatePaymentSettlements1790726400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_settlements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "paymentId" uuid NOT NULL,
        "courseItemCount" integer NOT NULL,
        "revenueTransactionCount" integer NOT NULL,
        "settledAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_settlements" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_settlements_payment" UNIQUE ("paymentId"),
        CONSTRAINT "CHK_payment_settlements_counts" CHECK (
          "courseItemCount" >= 0 AND "revenueTransactionCount" >= 0
          AND "revenueTransactionCount" <= "courseItemCount"
        ),
        CONSTRAINT "FK_payment_settlements_payment" FOREIGN KEY ("paymentId")
          REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    // Reuses the append-only guard function created in the R1 migration.
    await queryRunner.query(
      `CREATE TRIGGER "trg_payment_settlements_append_only" BEFORE UPDATE OR DELETE ON "payment_settlements" FOR EACH ROW EXECUTE FUNCTION revenue_block_mutation()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "trg_payment_settlements_no_truncate" BEFORE TRUNCATE ON "payment_settlements" FOR EACH STATEMENT EXECUTE FUNCTION revenue_block_mutation()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payment_settlements"`);
  }
}
