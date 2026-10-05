import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import Razorpay from 'razorpay';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { RevenueTransaction } from '../finance/entities/revenue-transaction.entity';
import { RevenueTransactionType } from '../finance/finance.enums';
import { fromPaise, toPaise } from '../finance/money.util';
import { proportionalReversal } from '../finance/revenue-calculator';
import { RevenueLedgerService } from '../finance/revenue-ledger.service';
import { AdminRefundDto } from './dto/admin-refund.dto';
import { PaymentItem } from './entities/payment-item.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { RefundItem } from './entities/refund-item.entity';
import { Refund, RefundKind, RefundSource } from './entities/refund.entity';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RecordRefundInput {
  providerRefundId: string;
  kind: RefundKind;
  source: RefundSource;
  providerPaymentId: string; // Razorpay pay_xxx
  amountPaise: bigint;
  currency?: string;
  occurredAt: Date;
  paymentItemId?: string; // when known (admin refunds); otherwise split proportionally
  reason?: string | null;
  initiatedById?: string | null;
}

export interface RecordRefundResult {
  created: boolean;
  refund: Refund;
}

/**
 * Turns a real-world refund / chargeback into ledger reversals.
 * Every path (admin action, refund webhook, dispute webhook) ends in recordRefund(), which is:
 *  - atomic: reversals + refund rows + access revocation commit or roll back together
 *  - serialised per payment (row lock), so admin call and webhook cannot both post
 *  - idempotent on providerRefundId
 * Original ledger rows are never touched; reversals are new negative rows.
 */
@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);
  private razorpay: Razorpay;

  constructor(
    private readonly ledger: RevenueLedgerService,
    private readonly config: ConfigService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.config.getOrThrow<string>('RAZORPAY_KEY_ID'),
      key_secret: this.config.getOrThrow<string>('RAZORPAY_KEY_SECRET'),
    });
  }

  // ───────────────────────── admin-initiated ─────────────────────────

  async adminRefund(adminId: string, dto: AdminRefundDto) {
    // 1. Validate against the LEDGER (not against anything the client sent).
    const ctx = await this.ledger.runInTransaction(async (manager) => {
      const row = await manager
        .createQueryBuilder(PaymentItem, 'i')
        .innerJoinAndSelect('i.payment', 'p')
        .where('i.id = :id', { id: dto.paymentItemId })
        .getOne();
      if (!row) throw new NotFoundException('Payment item not found');
      if (row.payment.status !== PaymentStatus.PAID || !row.payment.providerPaymentId) {
        throw new ConflictException('Only a PAID payment can be refunded');
      }

      const purchase = await manager.findOne(RevenueTransaction, {
        where: { paymentItemId: row.id, transactionType: RevenueTransactionType.COURSE_PURCHASE },
      });
      if (!purchase) {
        throw new ConflictException('This item has no revenue record yet (run the R2 backfill first)');
      }

      const remaining = await this.remainingPaise(purchase.id, manager);
      return { providerPaymentId: row.payment.providerPaymentId, remaining };
    });

    if (ctx.remaining <= 0n) throw new ConflictException('This item is already fully refunded');
    const amountPaise = dto.amount ? toPaise(dto.amount) : ctx.remaining;
    if (amountPaise <= 0n) throw new BadRequestException('Refund amount must be positive');
    if (amountPaise > ctx.remaining) {
      throw new ConflictException(`Refund exceeds what is still refundable (${fromPaise(ctx.remaining)} remaining)`);
    }

    // 2. Ask Razorpay to move the money.
    let providerRefund: { id: string; amount: number; currency?: string };
    try {
      providerRefund = (await this.razorpay.payments.refund(ctx.providerPaymentId, {
        amount: Number(amountPaise),
        speed: 'normal',
        notes: { paymentItemId: dto.paymentItemId, initiatedBy: adminId },
      })) as unknown as { id: string; amount: number; currency?: string };
    } catch (error) {
      const description = (error as { error?: { description?: string } })?.error?.description;
      throw new BadGatewayException(description ?? 'Razorpay rejected the refund');
    }

    // 3. Record it. If this step ever fails after Razorpay succeeded, the refund.processed
    //    webhook carries the paymentItemId in its notes and heals it automatically.
    const result = await this.recordRefund({
      providerRefundId: providerRefund.id,
      kind: 'REFUND',
      source: 'ADMIN',
      providerPaymentId: ctx.providerPaymentId,
      amountPaise: BigInt(providerRefund.amount),
      currency: providerRefund.currency,
      occurredAt: new Date(),
      paymentItemId: dto.paymentItemId,
      reason: dto.reason ?? null,
      initiatedById: adminId,
    });
    if (!result) throw new InternalServerErrorException('Refund was issued but could not be recorded');

    return {
      refundId: result.refund.id,
      providerRefundId: result.refund.providerRefundId,
      amount: result.refund.amount,
      created: result.created,
    };
  }

  // ───────────────────────── webhooks ─────────────────────────

  /** refund.processed - also covers refunds made from the Razorpay dashboard. */
  async recordFromRefundWebhook(entity: any): Promise<void> {
    if (!entity?.id || !entity?.payment_id || !Number.isInteger(entity.amount) || entity.amount <= 0) {
      throw new BadRequestException('Malformed refund webhook payload');
    }
    const notes = entity.notes && !Array.isArray(entity.notes) ? entity.notes : {};
    const paymentItemId =
      typeof notes.paymentItemId === 'string' && UUID_RE.test(notes.paymentItemId) ? notes.paymentItemId : undefined;

    const result = await this.recordRefund({
      providerRefundId: String(entity.id),
      kind: 'REFUND',
      source: 'WEBHOOK',
      providerPaymentId: String(entity.payment_id),
      amountPaise: BigInt(entity.amount),
      currency: entity.currency,
      occurredAt: entity.created_at ? new Date(entity.created_at * 1000) : new Date(),
      paymentItemId,
    });
    if (!result) this.logger.warn(`Refund ${entity.id}: payment ${entity.payment_id} is not one of ours - ignored`);
  }

  /** payment.dispute.lost - the bank took the money back. */
  async recordFromDisputeWebhook(entity: any): Promise<void> {
    if (!entity?.id || !entity?.payment_id || !Number.isInteger(entity.amount) || entity.amount <= 0) {
      throw new BadRequestException('Malformed dispute webhook payload');
    }
    const result = await this.recordRefund({
      providerRefundId: `dispute:${entity.id}`,
      kind: 'CHARGEBACK',
      source: 'WEBHOOK',
      providerPaymentId: String(entity.payment_id),
      amountPaise: BigInt(entity.amount),
      currency: entity.currency,
      occurredAt: entity.created_at ? new Date(entity.created_at * 1000) : new Date(),
      reason: 'Payment dispute lost',
    });
    if (!result) this.logger.warn(`Dispute ${entity.id}: payment ${entity.payment_id} is not one of ours - ignored`);
  }

  // ───────────────────────── core ─────────────────────────

  /** Returns null when the payment is not ours (caller decides whether that matters). */
  async recordRefund(input: RecordRefundInput): Promise<RecordRefundResult | null> {
    if (input.amountPaise <= 0n) throw new BadRequestException('Refund amount must be positive');

    return this.ledger.runInTransaction(async (manager) => {
      // Lock order is always: payment row -> original transactions (inside postReversal).
      const payment = await manager
        .getRepository(Payment)
        .createQueryBuilder('p')
        .setLock('pessimistic_write')
        .where('p.providerPaymentId = :id', { id: input.providerPaymentId })
        .getOne();
      if (!payment) return null;

      // Idempotency: this exact refund/dispute was already recorded.
      const existing = await manager.findOne(Refund, { where: { providerRefundId: input.providerRefundId } });
      if (existing) return { created: false, refund: existing };

      let purchases = await manager.find(RevenueTransaction, {
        where: { paymentId: payment.id, transactionType: RevenueTransactionType.COURSE_PURCHASE },
      });
      if (input.paymentItemId) purchases = purchases.filter((tx) => tx.paymentItemId === input.paymentItemId);

       if (purchases.length === 0) {
        // R10: a MEMBERSHIP payment was refunded / charged back - book it as a reversal in the open period.
        const membershipTxs = await manager.find(RevenueTransaction, {
          where: { paymentId: payment.id, transactionType: RevenueTransactionType.MEMBERSHIP_PAYMENT },
        });
        if (membershipTxs.length > 0) {
          return this.recordMembershipRefund(payment, membershipTxs, input, manager);
        }
        throw new ConflictException(`Payment ${payment.id} has no settled course revenue to reverse`);
      }
      const shares: { key: string; remainingPaise: bigint }[] = [];
      for (const tx of purchases) {
        const remainingPaise = await this.remainingPaise(tx.id, manager);
        if (remainingPaise > 0n) shares.push({ key: tx.id, remainingPaise });
      }
      if (shares.length === 0) throw new ConflictException('Nothing left to refund on this payment');

      const remainingTotal = shares.reduce((sum, share) => sum + share.remainingPaise, 0n);
      if (input.amountPaise > remainingTotal) {
        throw new ConflictException(`Refund exceeds what is still refundable (${fromPaise(remainingTotal)} remaining)`);
      }

      // Split the refund across items (a single named item takes it all).
      const perTx = proportionalReversal(shares, input.amountPaise);

      const reversalType =
        input.kind === 'CHARGEBACK' ? RevenueTransactionType.CHARGEBACK : RevenueTransactionType.REFUND;

      const applied: { tx: RevenueTransaction; paise: bigint; reversalId: string }[] = [];
      for (const tx of purchases) {
        const paise = perTx.get(tx.id) ?? 0n;
        if (paise <= 0n) continue;
        const posted = await this.ledger.postReversal(
          {
            originalTransactionId: tx.id,
            reversalType,
            amount: fromPaise(paise),
            idempotencyKey: `${input.providerRefundId}:${tx.paymentItemId}`,
            occurredAt: input.occurredAt,
          },
          manager,
        );
        applied.push({ tx, paise, reversalId: posted.transaction.id });
      }

      // Access: revoke only when the student's NET paid amount for the course is zero.
      const revoked = new Set<string>();
      for (const { tx } of applied) {
        if (!tx.studentId || !tx.courseId) continue;
        const rows: { net: string }[] = await manager.query(
          `SELECT COALESCE(SUM(a."amount"), 0) AS net
             FROM "revenue_allocations" a
             JOIN "revenue_transactions" t ON t."id" = a."revenueTransactionId"
            WHERE t."studentId" = $1 AND t."courseId" = $2`,
          [tx.studentId, tx.courseId],
        );
        if (toPaise(rows[0].net) <= 0n) {
          await manager.delete(Enrollment, { studentId: tx.studentId, courseId: tx.courseId });
          revoked.add(tx.id);
        }
      }

      const inserted = await manager.insert(Refund, {
        providerRefundId: input.providerRefundId,
        kind: input.kind,
        source: input.source,
        paymentId: payment.id,
        amount: fromPaise(input.amountPaise),
        currency: input.currency ? input.currency.toUpperCase() : payment.currency,
        reason: input.reason ?? null,
        initiatedById: input.initiatedById ?? null,
        occurredAt: input.occurredAt,
      });
      const refundId = inserted.identifiers[0].id as string;

      await manager.insert(
        RefundItem,
        applied.map(({ tx, paise, reversalId }) => ({
          refundId,
          paymentItemId: tx.paymentItemId as string,
          revenueTransactionId: tx.id,
          reversalTransactionId: reversalId,
          amount: fromPaise(paise),
          accessRevoked: revoked.has(tx.id),
        })),
      );

      const refund = await manager.findOneByOrFail(Refund, { id: refundId });
      return { created: true, refund };
    });
  }

  /** Still-unreversed money for one purchase (platform + teacher), in paise. */
  private async remainingPaise(transactionId: string, manager: EntityManager): Promise<bigint> {
    const net = await this.ledger.getNetAllocations(transactionId, manager);
    return net.reduce((sum, row) => sum + toPaise(row.net), 0n);
  }
  
  /** R10 - refund / chargeback of a membership payment. Same atomic transaction as recordRefund(). */
  private async recordMembershipRefund(
    payment: Payment,
    membershipTxs: RevenueTransaction[],
    input: RecordRefundInput,
    manager: EntityManager,
  ): Promise<RecordRefundResult> {
    let targets = membershipTxs;
    if (input.paymentItemId) targets = membershipTxs.filter((tx) => tx.paymentItemId === input.paymentItemId);

    const shares: { key: string; remainingPaise: bigint }[] = [];
    for (const tx of targets) {
      const remainingPaise = await this.ledger.getMembershipRemainingPaise(tx.id, manager);
      if (remainingPaise > 0n) shares.push({ key: tx.id, remainingPaise });
    }
    if (shares.length === 0) throw new ConflictException('Nothing left to refund on this membership payment');

    const remainingTotal = shares.reduce((sum, share) => sum + share.remainingPaise, 0n);
    if (input.amountPaise > remainingTotal) {
      throw new ConflictException(`Refund exceeds what is still refundable (${fromPaise(remainingTotal)} remaining)`);
    }

    const perTx = proportionalReversal(shares, input.amountPaise);
    const reversalType = input.kind === 'CHARGEBACK' ? RevenueTransactionType.CHARGEBACK : RevenueTransactionType.REFUND;

    const applied: { tx: RevenueTransaction; paise: bigint; reversalId: string }[] = [];
    for (const tx of targets) {
      const paise = perTx.get(tx.id) ?? 0n;
      if (paise <= 0n) continue;
      const posted = await this.ledger.postMembershipReversal(
        {
          originalTransactionId: tx.id,
          reversalType,
          amount: fromPaise(paise),
          idempotencyKey: `${input.providerRefundId}:${tx.paymentItemId}`,
          occurredAt: input.occurredAt,
        },
        manager,
      );
      applied.push({ tx, paise, reversalId: posted.transaction.id });
    }

    const inserted = await manager.insert(Refund, {
      providerRefundId: input.providerRefundId,
      kind: input.kind,
      source: input.source,
      paymentId: payment.id,
      amount: fromPaise(input.amountPaise),
      currency: input.currency ? input.currency.toUpperCase() : payment.currency,
      reason: input.reason ?? null,
      initiatedById: input.initiatedById ?? null,
      occurredAt: input.occurredAt,
    });
    const refundId = inserted.identifiers[0].id as string;

    await manager.insert(
      RefundItem,
      applied.map(({ tx, paise, reversalId }) => ({
        refundId,
        paymentItemId: tx.paymentItemId as string,
        revenueTransactionId: tx.id,
        reversalTransactionId: reversalId,
        amount: fromPaise(paise),
        accessRevoked: false, // R10 does not end the subscription - see the notes
      })),
    );

    const refund = await manager.findOneByOrFail(Refund, { id: refundId });
    return { created: true, refund };
  }
}
