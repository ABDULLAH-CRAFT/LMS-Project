import { RESERVING_STATUSES } from './payout-state';

export const RESERVED_SQL = RESERVING_STATUSES.map((s) => `'${s}'`).join(', ');

// Cutoff for the hold period. $2 is ALWAYS holdDays (integer).
export const CUTOFF_SQL = `now() - make_interval(days => $2::int)`;

// Every ledger line that can be paid to a teacher, and whether a live payout already holds it.
//   $1 = teacher id (uuid) or NULL for "all teachers"
//   holdAt: when a course line starts its hold period.
//     - a sale: its own date
//     - a refund/chargeback: the date of the ORIGINAL sale (so a refund of a held sale reduces "pending")
//     - an adjustment with no original: -infinity (a negative adjustment must never be delayed)
//   Membership lines come only from FINALIZED periods and are eligible immediately.
export const LINES_CTE = `
  WITH lines AS (
    SELECT a."id" AS "sourceId", 'COURSE_ALLOCATION'::text AS "kind", a."recipientId" AS "teacherId", a."amount" AS "amount",
           NULL::uuid AS "periodId", t."occurredAt" AS "occurredAt",
           CASE WHEN t."transactionType"::text = 'COURSE_PURCHASE' THEN t."occurredAt"
                WHEN o."id" IS NOT NULL THEN o."occurredAt"
                ELSE '-infinity'::timestamptz END AS "holdAt"
      FROM "revenue_allocations" a
      JOIN "revenue_transactions" t ON t."id" = a."revenueTransactionId"
      LEFT JOIN "revenue_transactions" o ON o."id" = t."reversesTransactionId"
     WHERE a."recipientType"::text = 'TEACHER' AND a."sourceType"::text = 'COURSE_PURCHASE' AND a."amount" <> 0
       AND ($1::uuid IS NULL OR a."recipientId" = $1::uuid)
    UNION ALL
    SELECT a."id", 'MEMBERSHIP_ALLOCATION'::text, a."teacherId", a."amount", a."periodId", p."finalizedAt", '-infinity'::timestamptz
      FROM "membership_period_allocations" a
      JOIN "revenue_periods" p ON p."id" = a."periodId" AND p."finalCalculationId" = a."calculationId"
     WHERE p."status"::text IN ('FINALIZED','PAYOUT_PROCESSING','PAID') AND a."amount" > 0
       AND ($1::uuid IS NULL OR a."teacherId" = $1::uuid)
  ),
  state AS (
    SELECT l.*, y."status"::text AS "payoutStatus"
      FROM lines l
      LEFT JOIN "payout_items" i ON i."sourceKind"::text = l."kind" AND i."sourceId" = l."sourceId" AND i."releasedAt" IS NULL
      LEFT JOIN "payouts" y ON y."id" = i."payoutId"
  )`;

// Aggregated buckets over `state s`. Uses $2 (holdDays).
export const BALANCE_AGG = `
  COALESCE(SUM(s."amount") FILTER (WHERE s."payoutStatus" IS NULL AND s."holdAt" > ${CUTOFF_SQL}), 0)::text AS "pending",
  COALESCE(SUM(s."amount") FILTER (WHERE s."payoutStatus" IS NULL AND s."holdAt" <= ${CUTOFF_SQL}), 0)::text AS "available",
  COALESCE(SUM(s."amount") FILTER (WHERE s."payoutStatus" IN (${RESERVED_SQL})), 0)::text AS "processing",
  COALESCE(SUM(s."amount") FILTER (WHERE s."payoutStatus" = 'PAID'), 0)::text AS "paid",
  COALESCE(SUM(s."amount") FILTER (WHERE s."amount" < 0), 0)::text AS "adjustments",
  MIN(s."holdAt") FILTER (WHERE s."payoutStatus" IS NULL AND s."amount" > 0 AND s."holdAt" > ${CUTOFF_SQL}) AS "oldestHeldAt"`;

// The lines a payout request would settle right now ($1 = teacher, $2 = holdDays).
export const ELIGIBLE_LINES_SQL = `${LINES_CTE}
  SELECT s."sourceId", s."kind", s."amount"::text AS "amount", s."periodId"
    FROM state s
   WHERE s."payoutStatus" IS NULL AND s."holdAt" <= ${CUTOFF_SQL}
   ORDER BY s."occurredAt" ASC, s."sourceId" ASC`;