import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { fromPaise, toPaise } from './money.util';

type Row = Record<string, any>;

const money = (value: string | null | undefined) => fromPaise(toPaise(value ?? '0'));

@Injectable()
export class FinanceQueryService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * ADMIN. Full lineage of one payment:
   * original purchase -> refund/chargeback -> revenue reversal -> final net (per item and per recipient).
   */
  async getPaymentRevenue(paymentId: string) {
    const txs: Row[] = await this.dataSource.query(
      `SELECT t."id", t."transactionType", t."amount", t."currency", t."paymentItemId", t."courseId",
              t."reversesTransactionId", t."occurredAt", c."title" AS "courseTitle"
         FROM "revenue_transactions" t
         LEFT JOIN "courses" c ON c."id" = t."courseId"
        WHERE t."paymentId" = $1
        ORDER BY t."occurredAt" ASC, t."createdAt" ASC`,
      [paymentId],
    );
    if (txs.length === 0) throw new NotFoundException('No revenue records for this payment');

    const ids = txs.map((t) => t.id);
    const allocations: Row[] = await this.dataSource.query(
      `SELECT "revenueTransactionId", "recipientType", "recipientId", "percentage", "amount"
         FROM "revenue_allocations"
        WHERE "revenueTransactionId" = ANY($1::uuid[])
        ORDER BY "recipientType" ASC, "createdAt" ASC`,
      [ids],
    );
    const refundInfo: Row[] = await this.dataSource.query(
      `SELECT ri."reversalTransactionId", ri."accessRevoked",
              r."id" AS "refundId", r."providerRefundId", r."kind", r."source", r."reason", r."initiatedById"
         FROM "refund_items" ri JOIN "refunds" r ON r."id" = ri."refundId"
        WHERE ri."reversalTransactionId" = ANY($1::uuid[])`,
      [ids],
    );

    const allocsByTx = new Map<string, Row[]>();
    for (const a of allocations) {
      const list = allocsByTx.get(a.revenueTransactionId) ?? [];
      list.push({
        recipientType: a.recipientType,
        recipientId: a.recipientId,
        percentage: a.percentage,
        amount: money(a.amount),
      });
      allocsByTx.set(a.revenueTransactionId, list);
    }
    const refundByReversal = new Map(refundInfo.map((r) => [r.reversalTransactionId, r]));

    const view = (t: Row) => ({
      transactionId: t.id,
      type: t.transactionType,
      amount: money(t.amount),
      currency: t.currency,
      occurredAt: t.occurredAt,
      allocations: allocsByTx.get(t.id) ?? [],
    });

    const items = txs
      .filter((t) => t.transactionType === 'COURSE_PURCHASE')
      .map((original) => {
        const reversals = txs
          .filter((t) => t.reversesTransactionId === original.id)
          .map((t) => ({ ...view(t), refund: refundByReversal.get(t.id) ?? null }));

        const net = new Map<string, { recipientType: string; recipientId: string | null; paise: bigint }>();
        for (const tx of [original, ...reversals.map((r) => ({ id: r.transactionId }))]) {
          for (const a of allocsByTx.get(tx.id) ?? []) {
            const key = `${a.recipientType}:${a.recipientId ?? ''}`;
            const entry = net.get(key) ?? { recipientType: a.recipientType, recipientId: a.recipientId, paise: 0n };
            entry.paise += toPaise(a.amount);
            net.set(key, entry);
          }
        }
        const netRows = [...net.values()].map((e) => ({
          recipientType: e.recipientType,
          recipientId: e.recipientId,
          net: fromPaise(e.paise),
        }));

        return {
          paymentItemId: original.paymentItemId,
          courseId: original.courseId,
          courseTitle: original.courseTitle,
          original: view(original),
          reversals,
          finalNet: fromPaise(netRows.reduce((sum, r) => sum + toPaise(r.net), 0n)),
          netByRecipient: netRows,
        };
      });

    const gross = items.reduce((s, i) => s + toPaise(i.original.amount), 0n);
    const net = items.reduce((s, i) => s + toPaise(i.finalNet), 0n);
    return {
      paymentId,
      items,
      totals: { gross: fromPaise(gross), refunded: fromPaise(gross - net), net: fromPaise(net) },
    };
  }

  /**
   * TEACHER. Only ever called with the logged-in teacher's own id (taken from the JWT,
   * never from the URL/body). Shows: original earning -> refund adjustment -> current balance.
   * Deliberately exposes no student or payment identifiers.
   */
  async getTeacherLedger(teacherId: string, limit: number, offset: number) {
    const entries: Row[] = await this.dataSource.query(
      `SELECT a."id" AS "allocationId", a."amount", a."percentage",
              t."id" AS "transactionId", t."transactionType", t."occurredAt",
              t."courseId", c."title" AS "courseTitle", t."reversesTransactionId"
         FROM "revenue_allocations" a
         JOIN "revenue_transactions" t ON t."id" = a."revenueTransactionId"
         LEFT JOIN "courses" c ON c."id" = t."courseId"
        WHERE a."recipientType" = 'TEACHER' AND a."recipientId" = $1
        ORDER BY t."occurredAt" DESC, a."createdAt" DESC
        LIMIT $2 OFFSET $3`,
      [teacherId, limit, offset],
    );

    const [sum]: Row[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(a."amount") FILTER (WHERE t."transactionType" = 'COURSE_PURCHASE'), 0) AS "earned",
              COALESCE(SUM(a."amount") FILTER (WHERE t."transactionType" IN ('REFUND','CHARGEBACK')), 0) AS "adjustments",
              COALESCE(SUM(a."amount"), 0) AS "net"
         FROM "revenue_allocations" a
         JOIN "revenue_transactions" t ON t."id" = a."revenueTransactionId"
        WHERE a."recipientType" = 'TEACHER' AND a."recipientId" = $1`,
      [teacherId],
    );

    return {
      summary: {
        courseEarnings: money(sum.earned),
        refundAdjustments: money(sum.adjustments), // negative or 0.00
        netEarnings: money(sum.net),
      },
      entries: entries.map((e) => ({
        allocationId: e.allocationId,
        transactionId: e.transactionId,
        type: e.transactionType,
        occurredAt: e.occurredAt,
        courseId: e.courseId,
        courseTitle: e.courseTitle,
        percentage: e.percentage,
        amount: money(e.amount), // negative for refunds/chargebacks
      })),
      paging: { limit, offset },
    };
  }
}
