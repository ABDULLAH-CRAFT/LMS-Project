import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { PaymentSettlementService } from '../payment/payment-settlement.service';

// Usage (from lms-backend):
//   npm run backfill:revenue -- --dry     -> only lists what it WOULD settle
//   npm run backfill:revenue              -> settles every PAID course payment that has no settlement yet
// Safe to re-run: settled payments are skipped.
async function main() {
  const dry = process.argv.includes('--dry');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const dataSource = app.get(DataSource);
  const settlement = app.get(PaymentSettlementService);

  const rows: { id: string }[] = await dataSource.query(`
    SELECT p."id" FROM "payments" p
    WHERE p."status" = 'paid'
      AND EXISTS (SELECT 1 FROM "payment_items" i WHERE i."paymentId" = p."id" AND i."referenceType" = 'course_enrollment')
      AND NOT EXISTS (SELECT 1 FROM "payment_settlements" s WHERE s."paymentId" = p."id")
    ORDER BY p."createdAt" ASC
  `);

  console.log(`${rows.length} PAID payment(s) without a settlement.`);
  if (dry) {
    rows.forEach((row) => console.log(` - ${row.id}`));
    await app.close();
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const result = await settlement.settle(row.id);
      ok++;
      console.log(`settled ${row.id}  ledger transactions created: ${result.revenuePostedNow}`);
    } catch (error) {
      failed++;
      console.error(`FAILED ${row.id}: ${(error as Error).message}`);
    }
  }
  console.log(`Done. settled=${ok} failed=${failed}`);
  await app.close();
}

main();
