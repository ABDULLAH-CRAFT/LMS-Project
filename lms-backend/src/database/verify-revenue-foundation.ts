import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Course } from '../entities/course.entity';
import { PaymentItem } from '../payment/entities/payment-item.entity';
import { RevenueTransactionType } from '../finance/finance.enums';
import { fromPaise, toPaise } from '../finance/money.util';
import { RevenueLedgerService } from '../finance/revenue-ledger.service';

class RollbackMarker extends Error {}

// Exercises the ledger against your REAL database inside one transaction and then
// ROLLS BACK, so nothing is saved. Needs one existing course_enrollment payment item.
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const dataSource = app.get(DataSource);
  const ledger = app.get(RevenueLedgerService);

  const item = await dataSource
    .getRepository(PaymentItem)
    .findOne({ where: { referenceType: 'course_enrollment' }, relations: { payment: true } });

  if (!item) {
    console.log('No course_enrollment payment item found. Create one test checkout first, then re-run.');
    await app.close();
    return;
  }

  const course = await dataSource.getRepository(Course).findOneByOrFail({ id: item.referenceId });
  const show = (rows: { recipientType: string; amount?: string; net?: string }[]) =>
    rows.map((r) => `${r.recipientType} ${r.amount ?? r.net}`).join(' | ');

  try {
    await ledger.runInTransaction(async (manager) => {
      const input = {
        paymentId: item.payment.id,
        paymentItemId: item.id,
        courseId: course.id,
        studentId: item.payment.userId,
        teacherId: course.teacherId,
        amount: String(item.amount),
        occurredAt: new Date(),
      };

      const first = await ledger.postCoursePurchase(input, manager);
      console.log(`1) post purchase   created=${first.created}  amount=${first.transaction.amount}  ${show(first.allocations)}`);

      const second = await ledger.postCoursePurchase(input, manager);
      console.log(`2) post it again   created=${second.created}  (must be false - idempotent)`);

      const refundAmount = fromPaise((toPaise(first.transaction.amount) * 4n) / 10n); // 40%
      const refund = await ledger.postReversal(
        {
          originalTransactionId: first.transaction.id,
          reversalType: RevenueTransactionType.REFUND,
          amount: refundAmount,
          idempotencyKey: `verify:${Date.now()}`,
          occurredAt: new Date(),
        },
        manager,
      );
      console.log(`3) refund ${refundAmount}   created=${refund.created}  ${show(refund.allocations)}`);

      const net = await ledger.getNetAllocations(first.transaction.id, manager);
      console.log(`4) net after refund  ${show(net)}`);

      await manager.query('SET CONSTRAINTS ALL IMMEDIATE'); // run the DB balance checks now
      console.log('5) database balance checks passed');

      throw new RollbackMarker();
    });
  } catch (error) {
    if (!(error instanceof RollbackMarker)) throw error;
    console.log('Rolled back - nothing was saved.');
  }

  await app.close();
}

main();