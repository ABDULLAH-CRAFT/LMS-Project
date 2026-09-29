import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FinanceQueryService } from './finance-query.service';
import { rangeView } from './finance-range.util';
import type { ResolvedRange } from './finance-range.util';
import { divRoundHalfUp, fromPaise, toPaise } from './money.util';

type Row = Record<string, any>;

const paise = (value: string | null | undefined): bigint => toPaise(value ?? '0');
const money = (value: string | null | undefined): string => fromPaise(paise(value));
const count = (value: unknown): number => Number(value ?? 0);
const sumPaise = (rows: Row[], key: string): bigint => rows.reduce((total, row) => total + paise(row[key]), 0n);

// Escapes % _ \ so a search for "50%" matches the literal text.
const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

// Every direct-course-revenue ledger row in [$1, $2): purchases, plus refunds/chargebacks that
// reverse a course purchase. (Membership rows are added in R7+ and are deliberately excluded.)
const COURSE_TX_CTE = `
  WITH course_tx AS (
    SELECT t."id", t."transactionType"::text AS "type", t."amount", t."paymentId", t."courseId", t."occurredAt"
      FROM "revenue_transactions" t
      LEFT JOIN "revenue_transactions" o ON o."id" = t."reversesTransactionId"
     WHERE t."occurredAt" >= $1 AND t."occurredAt" < $2
       AND (
         t."transactionType" = 'COURSE_PURCHASE'
         OR (t."transactionType" IN ('REFUND', 'CHARGEBACK') AND o."transactionType" = 'COURSE_PURCHASE')
       )
  )`;

@Injectable()
export class FinanceAdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly queries: FinanceQueryService,
  ) {}

  /** KPI cards. */
  async getOverview(range: ResolvedRange) {
    const [row]: Row[] = await this.dataSource.query(
      `${COURSE_TX_CTE}
       SELECT
         COALESCE(SUM(ct."amount") FILTER (WHERE ct."type" = 'COURSE_PURCHASE'), 0) AS "gross",
         COALESCE(-SUM(ct."amount") FILTER (WHERE ct."type" <> 'COURSE_PURCHASE'), 0) AS "refunds",
         COUNT(*) FILTER (WHERE ct."type" = 'COURSE_PURCHASE') AS "itemsSold",
         COUNT(DISTINCT ct."paymentId") FILTER (WHERE ct."type" = 'COURSE_PURCHASE') AS "orders",
         COUNT(*) FILTER (WHERE ct."type" <> 'COURSE_PURCHASE') AS "refundEvents",
         COALESCE(SUM(pa."amount"), 0) AS "platform",
         COALESCE(SUM(ta."amount"), 0) AS "teacher"
       FROM course_tx ct
       LEFT JOIN "revenue_allocations" pa ON pa."revenueTransactionId" = ct."id" AND pa."recipientType" = 'PLATFORM'
       LEFT JOIN "revenue_allocations" ta ON ta."revenueTransactionId" = ct."id" AND ta."recipientType" = 'TEACHER'`,
      [range.from, range.to],
    );

    const gross = paise(row.gross);
    const refunds = paise(row.refunds);
    const eligible = gross - refunds;
    const platform = paise(row.platform);
    const teacher = paise(row.teacher);
    const orders = count(row.orders);
    const averageOrderValue = orders > 0 ? divRoundHalfUp(gross, BigInt(orders)) : 0n;

    return {
      range: rangeView(range),
      grossSales: fromPaise(gross),
      refunds: fromPaise(refunds),
      eligibleRevenue: fromPaise(eligible),
      lmsRevenue: fromPaise(platform),
      teacherRevenue: fromPaise(teacher),
      itemsSold: count(row.itemsSold),
      orders,
      refundEvents: count(row.refundEvents),
      averageOrderValue: fromPaise(averageOrderValue),
      // Integrity signal: platform + teacher allocations must equal gross - refunds.
      reconciled: platform + teacher === eligible,
    };
  }

  /** Teacher revenue table (one row per teacher, including teachers with no sales). */
  async getTeacherRevenue(range: ResolvedRange) {
    const rows: Row[] = await this.dataSource.query(
      `${COURSE_TX_CTE},
       teacher_agg AS (
         SELECT ta."recipientId" AS "teacherId",
                COUNT(*) FILTER (WHERE ct."type" = 'COURSE_PURCHASE') AS "sales",
                COALESCE(SUM(ct."amount") FILTER (WHERE ct."type" = 'COURSE_PURCHASE'), 0) AS "gross",
                COALESCE(SUM(ta."amount") FILTER (WHERE ct."type" = 'COURSE_PURCHASE'), 0) AS "teacherShare",
                COALESCE(-SUM(ta."amount") FILTER (WHERE ct."type" <> 'COURSE_PURCHASE'), 0) AS "refunds"
           FROM course_tx ct
           JOIN "revenue_allocations" ta ON ta."revenueTransactionId" = ct."id" AND ta."recipientType" = 'TEACHER'
          GROUP BY ta."recipientId"
       )
       SELECT u."id" AS "teacherId", u."name", u."email",
              (SELECT COUNT(*) FROM "courses" c WHERE c."teacherId"::text = u."id"::text) AS "courses",
              COALESCE(a."sales", 0) AS "sales",
              COALESCE(a."gross", 0) AS "gross",
              COALESCE(a."teacherShare", 0) AS "teacherShare",
              COALESCE(a."refunds", 0) AS "refunds"
         FROM "users" u
         LEFT JOIN teacher_agg a ON a."teacherId" = u."id"
        WHERE u."role" = 'teacher'
        ORDER BY (COALESCE(a."teacherShare", 0) - COALESCE(a."refunds", 0)) DESC, u."name" ASC`,
      [range.from, range.to],
    );

    const teachers = rows.map((r) => {
      const gross = paise(r.gross);
      const teacherShare = paise(r.teacherShare);
      const refunds = paise(r.refunds);
      const net = teacherShare - refunds;
      return {
        teacherId: r.teacherId as string,
        name: r.name as string,
        email: r.email as string,
        courses: count(r.courses),
        sales: count(r.sales),
        grossRevenue: fromPaise(gross),
        lmsShare: fromPaise(gross - teacherShare), // before refunds
        teacherShare: fromPaise(teacherShare), // before refunds
        refunds: fromPaise(refunds), // the teacher's portion of refunds
        netEarnings: fromPaise(net),
        // Payouts do not exist until Phase R13: nothing has been paid, so everything earned is pending.
        pendingPayout: fromPaise(net),
        paidOut: '0.00',
      };
    });

    const totalGross = teachers.reduce((s, t) => s + toPaise(t.grossRevenue), 0n);
    const totalTeacherShare = teachers.reduce((s, t) => s + toPaise(t.teacherShare), 0n);
    const totalRefunds = teachers.reduce((s, t) => s + toPaise(t.refunds), 0n);
    const totalNet = totalTeacherShare - totalRefunds;

    return {
      range: rangeView(range),
      teachers,
      totals: {
        sales: teachers.reduce((s, t) => s + t.sales, 0),
        grossRevenue: fromPaise(totalGross),
        lmsShare: fromPaise(totalGross - totalTeacherShare),
        teacherShare: fromPaise(totalTeacherShare),
        refunds: fromPaise(totalRefunds),
        netEarnings: fromPaise(totalNet),
        pendingPayout: fromPaise(totalNet),
        paidOut: '0.00',
      },
    };
  }

  /** Course revenue table. LMS/Teacher revenue here are NET of refunds. */
  async getCourseRevenue(range: ResolvedRange) {
    const rows: Row[] = await this.dataSource.query(
      `${COURSE_TX_CTE}
       SELECT ct."courseId", c."title", u."id" AS "teacherId", u."name" AS "teacherName",
              COUNT(*) FILTER (WHERE ct."type" = 'COURSE_PURCHASE') AS "orders",
              COALESCE(SUM(ct."amount") FILTER (WHERE ct."type" = 'COURSE_PURCHASE'), 0) AS "gross",
              COALESCE(-SUM(ct."amount") FILTER (WHERE ct."type" <> 'COURSE_PURCHASE'), 0) AS "refunds",
              COALESCE(SUM(pa."amount"), 0) AS "platform",
              COALESCE(SUM(ta."amount"), 0) AS "teacher"
         FROM course_tx ct
         LEFT JOIN "revenue_allocations" pa ON pa."revenueTransactionId" = ct."id" AND pa."recipientType" = 'PLATFORM'
         LEFT JOIN "revenue_allocations" ta ON ta."revenueTransactionId" = ct."id" AND ta."recipientType" = 'TEACHER'
         LEFT JOIN "courses" c ON c."id" = ct."courseId"
         LEFT JOIN "users" u ON u."id"::text = c."teacherId"::text
        GROUP BY ct."courseId", c."title", u."id", u."name"
        ORDER BY "gross" DESC, c."title" ASC`,
      [range.from, range.to],
    );

    const courses = rows.map((r) => ({
      courseId: r.courseId as string,
      title: (r.title as string | null) ?? 'Deleted course',
      teacherId: (r.teacherId as string | null) ?? null,
      teacherName: (r.teacherName as string | null) ?? 'Unknown teacher',
      orders: count(r.orders),
      grossSales: money(r.gross),
      refunds: money(r.refunds),
      lmsRevenue: money(r.platform),
      teacherRevenue: money(r.teacher),
    }));

    return {
      range: rangeView(range),
      courses,
      totals: {
        orders: courses.reduce((s, c) => s + c.orders, 0),
        grossSales: fromPaise(sumPaise(rows, 'gross')),
        refunds: fromPaise(sumPaise(rows, 'refunds')),
        lmsRevenue: fromPaise(sumPaise(rows, 'platform')),
        teacherRevenue: fromPaise(sumPaise(rows, 'teacher')),
      },
    };
  }

  /**
   * One row per payment that had a course purchase in the range.
   * Refund/net figures cover the payment's WHOLE history (even refunds made after the range),
   * so the row always agrees with the detail screen.
   */
  async listTransactions(range: ResolvedRange, limit: number, offset: number, search?: string) {
    const params: any[] = [range.from, range.to];
    let searchSql = '';
    const term = (search ?? '').trim().slice(0, 100);
    if (term) {
      params.push(`%${escapeLike(term)}%`);
      const p = `$${params.length}`;
      searchSql = `AND (
        u."name" ILIKE ${p} OR u."email" ILIKE ${p}
        OR p."providerOrderId" ILIKE ${p} OR COALESCE(p."providerPaymentId", '') ILIKE ${p}
        OR p."id"::text ILIKE ${p}
      )`;
    }

    const base = `
      WITH pay AS (
        SELECT t."paymentId", MIN(t."occurredAt") AS "paidAt"
          FROM "revenue_transactions" t
         WHERE t."transactionType" = 'COURSE_PURCHASE' AND t."occurredAt" >= $1 AND t."occurredAt" < $2
         GROUP BY t."paymentId"
      )`;
    const fromSql = `
        FROM pay
        JOIN "payments" p ON p."id" = pay."paymentId"
        LEFT JOIN "users" u ON u."id"::text = p."userId"::text`;

    const [totalRow]: Row[] = await this.dataSource.query(
      `${base} SELECT COUNT(*) AS "total" ${fromSql} WHERE TRUE ${searchSql}`,
      params,
    );

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows: Row[] = await this.dataSource.query(
      `${base}
       SELECT p."id" AS "paymentId", pay."paidAt", p."providerOrderId", p."providerPaymentId", p."currency",
              u."id" AS "studentId", u."name" AS "studentName", u."email" AS "studentEmail",
              tx."items", tx."gross", tx."refunded", al."platform", al."teacher"
         ${fromSql}
         CROSS JOIN LATERAL (
           SELECT COUNT(*) FILTER (WHERE t."transactionType" = 'COURSE_PURCHASE') AS "items",
                  COALESCE(SUM(t."amount") FILTER (WHERE t."transactionType" = 'COURSE_PURCHASE'), 0) AS "gross",
                  COALESCE(-SUM(t."amount") FILTER (WHERE t."transactionType" IN ('REFUND', 'CHARGEBACK')), 0) AS "refunded"
             FROM "revenue_transactions" t
            WHERE t."paymentId" = p."id"
         ) tx
         CROSS JOIN LATERAL (
           SELECT COALESCE(SUM(a."amount") FILTER (WHERE a."recipientType" = 'PLATFORM'), 0) AS "platform",
                  COALESCE(SUM(a."amount") FILTER (WHERE a."recipientType" = 'TEACHER'), 0) AS "teacher"
             FROM "revenue_allocations" a
             JOIN "revenue_transactions" t ON t."id" = a."revenueTransactionId"
            WHERE t."paymentId" = p."id"
         ) al
        WHERE TRUE ${searchSql}
        ORDER BY pay."paidAt" DESC, p."id" ASC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, limit, offset],
    );

    const transactions = rows.map((r) => {
      const gross = paise(r.gross);
      const refunded = paise(r.refunded);
      let status: 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' = 'PAID';
      if (refunded > 0n) status = refunded >= gross ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      return {
        paymentId: r.paymentId as string,
        paidAt: r.paidAt as Date,
        providerOrderId: r.providerOrderId as string,
        providerPaymentId: (r.providerPaymentId as string | null) ?? null,
        currency: r.currency as string,
        studentId: (r.studentId as string | null) ?? null,
        studentName: (r.studentName as string | null) ?? 'Deleted user',
        studentEmail: (r.studentEmail as string | null) ?? '',
        items: count(r.items),
        gross: fromPaise(gross),
        refunded: fromPaise(refunded),
        net: fromPaise(gross - refunded),
        lmsNet: money(r.platform),
        teacherNet: money(r.teacher),
        status,
      };
    });

    return {
      range: rangeView(range),
      transactions,
      paging: { limit, offset, total: count(totalRow.total) },
    };
  }

  /**
   * Payment -> Payment items -> Course -> Teacher -> Revenue allocation -> Refunds -> Final amount.
   * Builds on the R3 lineage query and adds readable names.
   */
  async getTransactionDetail(paymentId: string) {
    const revenue = await this.queries.getPaymentRevenue(paymentId); // throws 404 when no ledger rows

    const [payment]: Row[] = await this.dataSource.query(
      `SELECT p."id", p."amount", p."currency", p."status", p."provider", p."providerOrderId",
              p."providerPaymentId", p."createdAt",
              u."id" AS "studentId", u."name" AS "studentName", u."email" AS "studentEmail"
         FROM "payments" p
         LEFT JOIN "users" u ON u."id"::text = p."userId"::text
        WHERE p."id" = $1`,
      [paymentId],
    );
    if (!payment) throw new NotFoundException('Payment not found');

    // Collect every user id we need a name for (teachers + the admin who issued a refund).
    const ids = new Set<string>();
    for (const item of revenue.items) {
      for (const a of item.original.allocations) if (a.recipientId) ids.add(a.recipientId);
      for (const reversal of item.reversals) {
        for (const a of reversal.allocations) if (a.recipientId) ids.add(a.recipientId);
        if (reversal.refund?.initiatedById) ids.add(reversal.refund.initiatedById);
      }
    }
    const users: Row[] = ids.size
      ? await this.dataSource.query(`SELECT "id", "name" FROM "users" WHERE "id" = ANY($1::uuid[])`, [[...ids]])
      : [];
    const names = new Map<string, string>(users.map((u) => [u.id as string, u.name as string]));

const recipientName = (type: string, id: string | null) =>
  type === 'PLATFORM'
    ? 'LMS / Platform'
    : ((id && names.get(id)) ?? 'Unknown teacher');

const withNames = (allocations: Row[]) =>
  allocations.map((a) => ({
    ...a,
    recipientName: recipientName(
      a.recipientType as string,
      (a.recipientId as string | null) ?? null,
    ),
  }));

    return {
      payment: {
        id: payment.id as string,
        amount: money(payment.amount),
        currency: payment.currency as string,
        status: payment.status as string,
        provider: payment.provider as string,
        providerOrderId: payment.providerOrderId as string,
        providerPaymentId: (payment.providerPaymentId as string | null) ?? null,
        createdAt: payment.createdAt as Date,
        studentId: (payment.studentId as string | null) ?? null,
        studentName: (payment.studentName as string | null) ?? 'Deleted user',
        studentEmail: (payment.studentEmail as string | null) ?? '',
      },
      items: revenue.items.map((item) => ({
        paymentItemId: item.paymentItemId,
        courseId: item.courseId,
        courseTitle: item.courseTitle ?? null,
        original: { ...item.original, allocations: withNames(item.original.allocations) },
        reversals: item.reversals.map((reversal) => ({
          ...reversal,
          allocations: withNames(reversal.allocations),
          refund: reversal.refund
            ? {
                refundId: reversal.refund.refundId,
                providerRefundId: reversal.refund.providerRefundId,
                kind: reversal.refund.kind,
                source: reversal.refund.source,
                reason: reversal.refund.reason ?? null,
                initiatedById: reversal.refund.initiatedById ?? null,
                initiatedByName: reversal.refund.initiatedById
                  ? (names.get(reversal.refund.initiatedById) ?? 'Unknown admin')
                  : null,
                accessRevoked: Boolean(reversal.refund.accessRevoked),
              }
            : null,
        })),
        finalNet: item.finalNet,
        netByRecipient: item.netByRecipient.map((n) => ({
          ...n,
          recipientName: recipientName(n.recipientType, n.recipientId),
        })),
      })),
      totals: revenue.totals,
    };
  }
}