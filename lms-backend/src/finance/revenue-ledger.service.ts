import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RevenueAllocation } from './entities/revenue-allocation.entity';
import { RevenueTransaction } from './entities/revenue-transaction.entity';
import {
  CALCULATION_VERSION,
  RevenueRecipientType,
  RevenueSourceType,
  RevenueTransactionStatus,
  RevenueTransactionType,
} from './finance.enums';
import { fromPaise, percentToBps, toPaise } from './money.util';
import { proportionalReversal, splitAmount } from './revenue-calculator';
import { RevenueRulesService } from './revenue-rules.service';

/**
 * INTERNAL API - there is deliberately no controller. Only server code that has
 * already loaded authoritative values from the database (Phase R2 loads them from
 * Payment / PaymentItem / Course) may call this. Never pass request-body values in.
 *
 * Every method takes an EntityManager so the ledger write can share ONE database
 * transaction with the payment confirmation and the enrollment.
 */

export interface PostCoursePurchaseInput {
  paymentId: string;
  paymentItemId: string; // one purchase transaction per payment item, ever
  courseId: string;
  studentId: string;
  teacherId: string; // must come from course.teacherId in the DB
  amount: string; // the payment item's amount, e.g. "1000.00"
  currency?: string;
  occurredAt: Date; // when the payment was actually paid
}

export interface PostReversalInput {
  originalTransactionId: string;
  reversalType: RevenueTransactionType.REFUND | RevenueTransactionType.CHARGEBACK;
  amount: string; // POSITIVE amount being reversed, e.g. "400.00"
  idempotencyKey: string; // e.g. the Razorpay refund id - unique per real-world refund event
  occurredAt: Date;
}

export interface LedgerPostResult {
  created: boolean; // false = this event was already posted; nothing was written
  transaction: RevenueTransaction;
  allocations: RevenueAllocation[];
}

export interface NetAllocation {
  recipientType: RevenueRecipientType;
  recipientId: string | null;
  net: string; // original + all reversals, e.g. "420.00"
}

@Injectable()
export class RevenueLedgerService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rules: RevenueRulesService,
  ) {}

  /** Convenience wrapper: everything inside `work` commits or rolls back together. */
  runInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }

  // ───────────────────────── purchase ─────────────────────────

  async postCoursePurchase(input: PostCoursePurchaseInput, manager: EntityManager): Promise<LedgerPostResult> {
    const amountPaise = toPaise(input.amount);
    if (amountPaise <= 0n) throw new BadRequestException('Course purchase amount must be positive');

    // Derived (not caller-supplied) so it cannot be spoofed or forgotten.
    // /verify, the webhook and any return handler all map to the SAME key.
    const idempotencyKey = `course_purchase:${input.paymentItemId}`;

    const existing = await this.findByKey(idempotencyKey, manager);
    if (existing) return this.load(existing, false, manager);

    const rule = await this.rules.getEffectiveRule(RevenueSourceType.COURSE_PURCHASE, input.occurredAt, manager);
    const { platformPaise, teacherPaise } = splitAmount(
      amountPaise,
      percentToBps(rule.platformPercentage),
      percentToBps(rule.teacherPercentage),
    );

    // ON CONFLICT DO NOTHING: two concurrent callers cannot both insert, and the
    // loser does not abort the surrounding database transaction.
    const inserted = await manager
      .createQueryBuilder()
      .insert()
      .into(RevenueTransaction)
      .values({
        idempotencyKey,
        transactionType: RevenueTransactionType.COURSE_PURCHASE,
        status: RevenueTransactionStatus.POSTED,
        amount: fromPaise(amountPaise),
        currency: input.currency ?? 'INR',
        paymentId: input.paymentId,
        paymentItemId: input.paymentItemId,
        courseId: input.courseId,
        studentId: input.studentId,
        revenueRuleId: rule.id,
        occurredAt: input.occurredAt,
      })
      .orIgnore()
      .returning('id')
      .execute();

    const newId = (inserted.raw as { id?: string }[] | undefined)?.[0]?.id;
    if (!newId) {
      const winner = await this.findByKey(idempotencyKey, manager);
      if (!winner) throw new ConflictException('Could not record the revenue transaction');
      return this.load(winner, false, manager);
    }

    await manager.getRepository(RevenueAllocation).insert([
      {
        revenueTransactionId: newId,
        recipientType: RevenueRecipientType.PLATFORM,
        recipientId: null,
        percentage: rule.platformPercentage,
        amount: fromPaise(platformPaise),
        sourceType: RevenueSourceType.COURSE_PURCHASE,
        sourceId: input.courseId,
        calculationVersion: CALCULATION_VERSION,
      },
      {
        revenueTransactionId: newId,
        recipientType: RevenueRecipientType.TEACHER,
        recipientId: input.teacherId,
        percentage: rule.teacherPercentage,
        amount: fromPaise(teacherPaise),
        sourceType: RevenueSourceType.COURSE_PURCHASE,
        sourceId: input.courseId,
        calculationVersion: CALCULATION_VERSION,
      },
    ]);

    const transaction = await manager.findOneByOrFail(RevenueTransaction, { id: newId });
    return this.load(transaction, true, manager);
  }

  // ───────────────────────── refund / chargeback ─────────────────────────

  async postReversal(input: PostReversalInput, manager: EntityManager): Promise<LedgerPostResult> {
    const refundPaise = toPaise(input.amount);
    if (refundPaise <= 0n) throw new BadRequestException('Reversal amount must be positive');

    // Row lock: concurrent partial refunds of the same purchase are serialised, so
    // the "remaining refundable" figure below can never be read stale.
    // (Throws if not inside a transaction - which is what we want.)
    const original = await manager
      .getRepository(RevenueTransaction)
      .createQueryBuilder('t')
      .setLock('pessimistic_write')
      .where('t.id = :id', { id: input.originalTransactionId })
      .getOne();
    if (!original) throw new NotFoundException('Original revenue transaction not found');
    if (original.transactionType !== RevenueTransactionType.COURSE_PURCHASE) {
      throw new BadRequestException('Only course purchases can be reversed here');
    }

    const idempotencyKey = `reversal:${input.idempotencyKey}`;
    const existing = await this.findByKey(idempotencyKey, manager);
    if (existing) return this.load(existing, false, manager);

    const originalAllocations = await manager.find(RevenueAllocation, {
      where: { revenueTransactionId: original.id },
    });
    const net = await this.getNetAllocations(original.id, manager);

    const shares = net.map((row) => ({
      key: this.key(row.recipientType, row.recipientId),
      remainingPaise: toPaise(row.net),
    }));
    const remainingTotal = shares.reduce((sum, share) => sum + share.remainingPaise, 0n);
    if (refundPaise > remainingTotal) {
      throw new ConflictException(
        `Refund exceeds what is still refundable (${fromPaise(remainingTotal)} remaining)`,
      );
    }

    const reversalShares = proportionalReversal(shares, refundPaise);

    const reversal = await manager.getRepository(RevenueTransaction).save(
      manager.getRepository(RevenueTransaction).create({
        idempotencyKey,
        transactionType: input.reversalType,
        status: RevenueTransactionStatus.POSTED,
        amount: fromPaise(-refundPaise),
        currency: original.currency,
        paymentId: original.paymentId,
        paymentItemId: original.paymentItemId,
        courseId: original.courseId,
        studentId: original.studentId,
        periodId: original.periodId,
        reversesTransactionId: original.id,
        revenueRuleId: original.revenueRuleId,
        occurredAt: input.occurredAt,
      }),
    );

    const rows = originalAllocations
      .map((alloc) => ({
        alloc,
        paise: reversalShares.get(this.key(alloc.recipientType, alloc.recipientId)) ?? 0n,
      }))
      .filter((row) => row.paise > 0n) // skip zero shares
      .map(({ alloc, paise }) => ({
        revenueTransactionId: reversal.id,
        recipientType: alloc.recipientType,
        recipientId: alloc.recipientId,
        percentage: alloc.percentage,
        amount: fromPaise(-paise),
        sourceType: alloc.sourceType,
        sourceId: alloc.sourceId,
        calculationVersion: alloc.calculationVersion,
      }));

    await manager.getRepository(RevenueAllocation).insert(rows);
    return this.load(reversal, true, manager);
  }

  // ───────────────────────── reads ─────────────────────────

  /** Net per recipient for one purchase: the original allocations plus every reversal against it. */
  async getNetAllocations(transactionId: string, manager: EntityManager): Promise<NetAllocation[]> {
    const rows = await manager
      .createQueryBuilder(RevenueAllocation, 'a')
      .innerJoin(RevenueTransaction, 't', 't.id = a.revenueTransactionId')
      .select('a.recipientType', 'recipientType')
      .addSelect('a.recipientId', 'recipientId')
      .addSelect('SUM(a.amount)', 'net')
      .where('t.id = :id OR t.reversesTransactionId = :id', { id: transactionId })
      .groupBy('a.recipientType')
      .addGroupBy('a.recipientId')
      .orderBy('a.recipientType', 'ASC')
      .getRawMany<{ recipientType: RevenueRecipientType; recipientId: string | null; net: string }>();

    return rows.map((row) => ({
      recipientType: row.recipientType,
      recipientId: row.recipientId,
      net: fromPaise(toPaise(row.net)), // normalise "420" -> "420.00"
    }));
  }

  // ───────────────────────── helpers ─────────────────────────

  private key(type: RevenueRecipientType, recipientId: string | null): string {
    return `${type}:${recipientId ?? ''}`;
  }

  private findByKey(idempotencyKey: string, manager: EntityManager) {
    return manager.findOne(RevenueTransaction, { where: { idempotencyKey } });
  }

  private async load(transaction: RevenueTransaction, created: boolean, manager: EntityManager): Promise<LedgerPostResult> {
    const allocations = await manager.find(RevenueAllocation, {
      where: { revenueTransactionId: transaction.id },
      order: { recipientType: 'ASC', createdAt: 'ASC' },
    });
    return { created, transaction, allocations };
  }
}