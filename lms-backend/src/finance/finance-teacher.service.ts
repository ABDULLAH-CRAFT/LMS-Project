import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { fromPaise, toPaise } from './money.util';
import type { TeacherRange } from './finance-teacher-range.util';

type Row = Record<string, any>;

const paise = (value: string | null | undefined): bigint => toPaise(value ?? '0');
const count = (value: unknown): number => Number(value ?? 0);

const ADJUSTMENT_TYPES = `('REFUND', 'CHARGEBACK', 'ADJUSTMENT')`;

// Every ledger allocation that belongs to ONE teacher. $1 is ALWAYS the teacher id taken from the JWT.
const MINE_CTE = `
  WITH mine AS (
    SELECT a."id" AS "allocationId", a."amount" AS "share", a."percentage",
           a."sourceType"::text AS "source",
           t."id" AS "txId", t."transactionType"::text AS "type", t."amount" AS "txAmount",
           t."courseId", t."studentId", t."reversesTransactionId", t."occurredAt"
      FROM "revenue_allocations" a
      JOIN "revenue_transactions" t ON t."id" = a."revenueTransactionId"
     WHERE a."recipientType" = 'TEACHER' AND a."recipientId" = $1::uuid
  )`;

const shortRef = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase();

@Injectable()
export class FinanceTeacherService {
  constructor(private readonly dataSource: DataSource) {}

  /** Lifetime earnings summary + last 6 IST months. */
  async getOverview(teacherId: string) {
    const [row]: Row[] = await this.dataSource.query(
      `${MINE_CTE}
       SELECT
         COALESCE(SUM("share") FILTER (WHERE "source" = 'COURSE_PURCHASE' AND "type" NOT IN ${ADJUSTMENT_TYPES}), 0) AS "course",
         COALESCE(SUM("share") FILTER (WHERE "source" = 'MEMBERSHIP_POOL' AND "type" NOT IN ${ADJUSTMENT_TYPES}), 0) AS "membership",
         COALESCE(SUM("share") FILTER (WHERE "type" IN ${ADJUSTMENT_TYPES}), 0) AS "adjustments",
         COUNT(*) FILTER (WHERE "type" = 'COURSE_PURCHASE') AS "sales",
         COUNT(*) FILTER (WHERE "type" IN ('REFUND', 'CHARGEBACK')) AS "refundEvents"
       FROM mine`,
      [teacherId],
    );

    const monthlyRows: Row[] = await this.dataSource.query(
      `${MINE_CTE}
       SELECT to_char("occurredAt" AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') AS "month",
              COALESCE(SUM("share"), 0) AS "net",
              COUNT(*) FILTER (WHERE "type" = 'COURSE_PURCHASE') AS "sales"
         FROM mine
        WHERE ("occurredAt" AT TIME ZONE 'Asia/Kolkata') >= date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') - interval '5 months'
        GROUP BY 1`,
      [teacherId],
    );

    // R12 - frozen membership shares of FINALIZED periods (the R10 tables). Provisional periods are NOT counted.
    const FINAL_MEMBERSHIP_WHERE = `
      a."teacherId" = $1::uuid
      AND p."finalCalculationId" = a."calculationId"
      AND p."status"::text IN ('FINALIZED','PAYOUT_PROCESSING','PAID')`;

    const [finalMembershipRow]: Row[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(a."amount"), 0)::text AS "total"
         FROM "membership_period_allocations" a
         JOIN "revenue_periods" p ON p."id" = a."periodId"
        WHERE ${FINAL_MEMBERSHIP_WHERE}`,
      [teacherId],
    );

    const membershipMonthlyRows: Row[] = await this.dataSource.query(
      `SELECT to_char(p."periodStart", 'YYYY-MM') AS "month", COALESCE(SUM(a."amount"), 0)::text AS "net"
         FROM "membership_period_allocations" a
         JOIN "revenue_periods" p ON p."id" = a."periodId"
        WHERE ${FINAL_MEMBERSHIP_WHERE}
          AND p."periodStart" >= (date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') - interval '5 months')::date
        GROUP BY 1`,
      [teacherId],
    );

    const membershipByMonth = new Map(
      membershipMonthlyRows.map((m) => [m.month as string, paise(m.net)]),
    );

    const course = paise(row.course);
    const membership = paise(row.membership) + paise(finalMembershipRow.total);
    const adjustments = paise(row.adjustments); // negative or zero
    const total = course + membership;
    const net = total + adjustments;

    // R13 - what has actually been paid to this teacher (lines in PAID payouts)
    const [paidRow]: Row[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(i."amount"), 0)::text AS "paid"
         FROM "payout_items" i JOIN "payouts" y ON y."id" = i."payoutId"
        WHERE y."teacherId" = $1::uuid AND y."status"::text = 'PAID' AND i."releasedAt" IS NULL`,
      [teacherId],
    );
    const paid = paise(paidRow.paid);

    // Always return 6 months, oldest first, using the current month in IST.
    const ist = new Date(Date.now() + 330 * 60 * 1000);
    const byMonth = new Map(monthlyRows.map((m) => [m.month as string, m]));
    const monthly: { month: string; net: string; sales: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const key = new Date(
        Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - i, 1),
      )
        .toISOString()
        .slice(0, 7);

      const hit = byMonth.get(key);
      const membershipNet = membershipByMonth.get(key) ?? 0n;

      monthly.push({
        month: key,
        net: fromPaise(paise(hit?.net) + membershipNet),
        sales: count(hit?.sales),
      });
    }

    return {
      currency: 'INR',
      totalEarnings: fromPaise(total),
      courseSalesEarnings: fromPaise(course),
      membershipEarnings: fromPaise(membership),
      refundAdjustments: fromPaise(adjustments),
      netEarnings: fromPaise(net),
      pendingPayout: fromPaise(net - paid), // R13: net earnings that have not been paid out yet
      paidAmount: fromPaise(paid), // R13
      sales: count(row.sales),
      refundEvents: count(row.refundEvents),
      thisMonthNet: monthly[monthly.length - 1].net,
      monthly,
    };
  }

  /** Per-course earnings in a date range. Includes the teacher's courses that had no activity. */
  async getCourseEarnings(teacherId: string, range: TeacherRange) {
    const rows: Row[] = await this.dataSource.query(
      `${MINE_CTE},
       range_mine AS (
         SELECT * FROM mine
          WHERE "source" = 'COURSE_PURCHASE' AND "occurredAt" >= $2 AND "occurredAt" < $3
       ),
       agg AS (
         SELECT "courseId",
                COUNT(*) FILTER (WHERE "type" = 'COURSE_PURCHASE') AS "sales",
                COUNT(DISTINCT "studentId") FILTER (WHERE "type" = 'COURSE_PURCHASE') AS "students",
                COALESCE(SUM("txAmount") FILTER (WHERE "type" = 'COURSE_PURCHASE'), 0) AS "gross",
                COALESCE(SUM("share") FILTER (WHERE "type" = 'COURSE_PURCHASE'), 0) AS "teacherShare",
                COALESCE(-SUM("share") FILTER (WHERE "type" IN ${ADJUSTMENT_TYPES}), 0) AS "refunds"
           FROM range_mine
          GROUP BY "courseId"
       )
       SELECT c."id" AS "courseId", c."title", c."status"::text AS "status",
              COALESCE(a."sales", 0) AS "sales", COALESCE(a."students", 0) AS "students",
              COALESCE(a."gross", 0) AS "gross", COALESCE(a."teacherShare", 0) AS "teacherShare",
              COALESCE(a."refunds", 0) AS "refunds"
         FROM "courses" c
         LEFT JOIN agg a ON a."courseId" = c."id"
        WHERE c."teacherId"::text = $1::uuid::text OR a."courseId" IS NOT NULL
        ORDER BY (COALESCE(a."teacherShare", 0) - COALESCE(a."refunds", 0)) DESC, c."title" ASC`,
      [teacherId, range.from, range.to],
    );

    const courses = rows.map((r) => {
      const gross = paise(r.gross);
      const teacherShare = paise(r.teacherShare);
      const refunds = paise(r.refunds);

      return {
        courseId: r.courseId as string,
        title: r.title as string,
        status: r.status as string,
        students: count(r.students),
        sales: count(r.sales),
        grossRevenue: fromPaise(gross),
        lmsShare: fromPaise(gross - teacherShare),
        teacherShare: fromPaise(teacherShare),
        refunds: fromPaise(refunds),
        netEarnings: fromPaise(teacherShare - refunds),
      };
    });

    const sum = (pick: (c: (typeof courses)[number]) => string) =>
      courses.reduce((total, c) => total + toPaise(pick(c)), 0n);

    const totalGross = sum((c) => c.grossRevenue);
    const totalTeacherShare = sum((c) => c.teacherShare);
    const totalRefunds = sum((c) => c.refunds);

    return {
      range: range.view,
      courses,
      totals: {
        sales: courses.reduce((total, c) => total + c.sales, 0),
        grossRevenue: fromPaise(totalGross),
        lmsShare: fromPaise(totalGross - totalTeacherShare),
        teacherShare: fromPaise(totalTeacherShare),
        refunds: fromPaise(totalRefunds),
        netEarnings: fromPaise(totalTeacherShare - totalRefunds),
      },
    };
  }

  /**
   * One row per course purchase that earned this teacher money in the range, with any refund
   * adjustments (made at any time) folded in. Exposes no student name/email and no payment ids.
   */
  async getStatement(
    teacherId: string,
    range: TeacherRange,
    limit: number,
    offset: number,
  ) {
    const PURCHASES_CTE = `${MINE_CTE},
      purchases AS (
        SELECT * FROM mine
         WHERE "source" = 'COURSE_PURCHASE' AND "type" = 'COURSE_PURCHASE'
           AND "occurredAt" >= $2 AND "occurredAt" < $3
      )`;

    const [totalsRow]: Row[] = await this.dataSource.query(
      `${PURCHASES_CTE}
       SELECT COUNT(*) AS "entries",
              COALESCE(SUM(p."txAmount"), 0) AS "gross",
              COALESCE(SUM(p."share"), 0) AS "earnings",
              COALESCE(SUM(adj."adjustments"), 0) AS "adjustments"
         FROM purchases p
         CROSS JOIN LATERAL (
           SELECT COALESCE(SUM(m."share"), 0) AS "adjustments"
             FROM mine m WHERE m."reversesTransactionId" = p."txId"
         ) adj`,
      [teacherId, range.from, range.to],
    );

    const rows: Row[] = await this.dataSource.query(
      `${PURCHASES_CTE}
       SELECT p."allocationId", p."txId", p."occurredAt", p."txAmount", p."percentage", p."share",
              c."title" AS "courseTitle",
              upper(substr(md5($1::uuid::text || COALESCE(p."studentId"::text, '')), 1, 8)) AS "learnerRef",
              adj."adjustments"
         FROM purchases p
         LEFT JOIN "courses" c ON c."id" = p."courseId"
         CROSS JOIN LATERAL (
           SELECT COALESCE(SUM(m."share"), 0) AS "adjustments"
             FROM mine m WHERE m."reversesTransactionId" = p."txId"
         ) adj
        ORDER BY p."occurredAt" DESC, p."allocationId" ASC
        LIMIT $4 OFFSET $5`,
      [teacherId, range.from, range.to, limit, offset],
    );

    // Refund adjustments for the rows on this page (original earning -> refund -> current balance).
    const txIds = rows.map((r) => r.txId as string);

    const refundRows: Row[] = txIds.length
      ? await this.dataSource.query(
          `${MINE_CTE}
           SELECT m."reversesTransactionId", m."txId", m."type", m."occurredAt", m."share"
             FROM mine m
            WHERE m."reversesTransactionId" = ANY($2::uuid[])
            ORDER BY m."occurredAt" ASC`,
          [teacherId, txIds],
        )
      : [];

    const refundsByOriginal = new Map<
      string,
      {
        reference: string;
        type: string;
        occurredAt: Date;
        amount: string;
      }[]
    >();

    for (const r of refundRows) {
      const list =
        refundsByOriginal.get(r.reversesTransactionId as string) ?? [];

      list.push({
        reference: shortRef(r.txId as string),
        type: r.type as string,
        occurredAt: r.occurredAt as Date,
        amount: fromPaise(paise(r.share)),
      });

      refundsByOriginal.set(r.reversesTransactionId as string, list);
    }

    // R13 - where each earning is in the payout lifecycle (the teacher's own lines only)
    const allocationIds = rows.map((r) => r.allocationId as string);

    const payoutRows: Row[] = allocationIds.length
      ? await this.dataSource.query(
          `SELECT i."sourceId", y."status"::text AS "status"
             FROM "payout_items" i
             JOIN "payouts" y ON y."id" = i."payoutId"
            WHERE i."sourceKind"::text = 'COURSE_ALLOCATION' AND i."releasedAt" IS NULL
              AND y."teacherId" = $2::uuid AND i."sourceId" = ANY($1::uuid[])`,
          [allocationIds, teacherId],
        )
      : [];

    const payoutStatusByAllocation = new Map<
      string,
      'REQUESTED' | 'PROCESSING' | 'PAID'
    >();

    for (const p of payoutRows) {
      const s = p.status as string;
      const label =
        s === 'PAID'
          ? 'PAID'
          : s === 'PENDING' || s === 'APPROVED'
            ? 'REQUESTED'
            : 'PROCESSING';

      payoutStatusByAllocation.set(p.sourceId as string, label);
    }

    const entries = rows.map((r) => {
      const earning = paise(r.share);
      const adjustments = paise(r.adjustments);
      const net = earning + adjustments;

      let status: 'EARNED' | 'PARTIALLY_REFUNDED' | 'REFUNDED' = 'EARNED';

      if (adjustments < 0n) {
        status = net <= 0n ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      }

      return {
        allocationId: r.allocationId as string,
        occurredAt: r.occurredAt as Date,
        reference: shortRef(r.txId as string),
        courseTitle: (r.courseTitle as string | null) ?? 'Deleted course',
        learnerRef: `L-${r.learnerRef as string}`,
        grossAmount: fromPaise(paise(r.txAmount)),
        teacherPercentage: r.percentage as string,
        teacherEarning: fromPaise(earning),
        adjustments: fromPaise(adjustments),
        netEarning: fromPaise(net),
        status,
        payoutStatus:
          payoutStatusByAllocation.get(r.allocationId as string) ??
          ('UNPAID' as const),
        refunds: refundsByOriginal.get(r.txId as string) ?? [],
      };
    });

    const earnings = paise(totalsRow.earnings);
    const adjustments = paise(totalsRow.adjustments);

    return {
      range: range.view,
      entries,
      totals: {
        entries: count(totalsRow.entries),
        grossAmount: fromPaise(paise(totalsRow.gross)),
        teacherEarning: fromPaise(earnings),
        adjustments: fromPaise(adjustments),
        netEarning: fromPaise(earnings + adjustments),
      },
      paging: {
        limit,
        offset,
        total: count(totalsRow.entries),
      },
    };
  }
}