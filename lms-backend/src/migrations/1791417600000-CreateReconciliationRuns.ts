import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReconciliationRuns1791417600000 implements MigrationInterface {
  name = 'CreateReconciliationRuns1791417600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reconciliation_runs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ranAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "ranById" uuid,
        "checkCount" integer NOT NULL,
        "failedCount" integer NOT NULL,
        "criticalIssues" integer NOT NULL,
        "warningIssues" integer NOT NULL,
        "results" jsonb NOT NULL,
        "figures" jsonb NOT NULL,
        CONSTRAINT "PK_reconciliation_runs" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_reconciliation_runs_counts" CHECK (
          "checkCount" >= 0 AND "failedCount" >= 0 AND "criticalIssues" >= 0 AND "warningIssues" >= 0
        ),
        CONSTRAINT "FK_reconciliation_runs_ranBy" FOREIGN KEY ("ranById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_reconciliation_runs_ranAt" ON "reconciliation_runs" ("ranAt")`);

    // Append-only (reuses the R1 guard function).
    await queryRunner.query(
      `CREATE TRIGGER "trg_reconciliation_runs_append_only" BEFORE UPDATE OR DELETE ON "reconciliation_runs" FOR EACH ROW EXECUTE FUNCTION revenue_block_mutation()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "trg_reconciliation_runs_no_truncate" BEFORE TRUNCATE ON "reconciliation_runs" FOR EACH STATEMENT EXECUTE FUNCTION revenue_block_mutation()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reconciliation_runs"`);
  }
}