// Every check is a read-only SQL query that returns the PROBLEM rows (0 rows = pass).
// Each query must return exactly these columns: "reference" (text), "detail" (text), "amount" (text, nullable).

export type CheckSeverity = 'CRITICAL' | 'WARNING';

export interface SqlCheck {
  code: string;
  title: string;
  description: string;
  severity: CheckSeverity;
  sql: string;
}

export const LOCKED_SQL = `'FINALIZED','PAYOUT_PROCESSING','PAID'`;

// A payment that became PAID a moment ago may still be mid-settlement (webhook / verify race).
const GRACE = `now() - interval '2 minutes'`;

export const SQL_CHECKS: SqlCheck[] = [
  {
    code: 'PAYMENT_WITHOUT_REVENUE',
    title: 'Payment without revenue allocation',
    description: 'A PAID course/membership payment item that has no ledger transaction.',
    severity: 'CRITICAL',
    sql: `
      SELECT i."id"::text AS "reference",
             'Paid ' || i."referenceType" || ' item on payment ' || p."id"::text || ' has no revenue transaction' AS "detail",
             (i."amount" * i."quantity")::text AS "amount"
        FROM "payment_items" i
        JOIN "payments" p ON p."id" = i."paymentId"
       WHERE p."status"::text = 'paid'
         AND p."updatedAt" < ${GRACE}
         AND i."referenceType" IN ('course_enrollment', 'membership_plan')
         AND i."amount" * i."quantity" > 0
         AND NOT EXISTS (
           SELECT 1 FROM "revenue_transactions" t
            WHERE t."paymentItemId" = i."id" AND t."transactionType"::text IN ('COURSE_PURCHASE', 'MEMBERSHIP_PAYMENT')
         )
       ORDER BY p."updatedAt" DESC`,
  },
  {
    code: 'REVENUE_WITHOUT_PAYMENT',
    title: 'Revenue without a paid payment',
    description: 'A purchase / membership ledger row whose payment is missing, not PAID, or does not own the item.',
    severity: 'CRITICAL',
    sql: `
      SELECT t."id"::text AS "reference",
             'Ledger ' || t."transactionType"::text || ' has no valid PAID payment behind it' AS "detail",
             t."amount"::text AS "amount"
        FROM "revenue_transactions" t
        LEFT JOIN "payments" p ON p."id" = t."paymentId"
        LEFT JOIN "payment_items" i ON i."id" = t."paymentItemId"
       WHERE t."transactionType"::text IN ('COURSE_PURCHASE', 'MEMBERSHIP_PAYMENT')
         AND (t."paymentId" IS NULL OR p."id" IS NULL OR p."status"::text <> 'paid'
              OR t."paymentItemId" IS NULL OR i."id" IS NULL OR i."paymentId" <> t."paymentId")
       ORDER BY t."occurredAt" DESC`,
  },
  {
    code: 'DUPLICATE_ALLOCATION',
    title: 'Duplicate allocation / duplicate payout line',
    description: 'The same payment item posted twice, the same recipient allocated twice, or one earning inside two live payouts.',
    severity: 'CRITICAL',
    sql: `
      SELECT d."reference", d."detail", NULL::text AS "amount" FROM (
        SELECT t."paymentItemId"::text AS "reference",
               COUNT(*)::text || ' ' || t."transactionType"::text || ' ledger rows exist for one payment item' AS "detail"
          FROM "revenue_transactions" t
         WHERE t."transactionType"::text IN ('COURSE_PURCHASE', 'MEMBERSHIP_PAYMENT') AND t."paymentItemId" IS NOT NULL
         GROUP BY t."paymentItemId", t."transactionType"
        HAVING COUNT(*) > 1
        UNION ALL
        SELECT a."revenueTransactionId"::text,
               COUNT(*)::text || ' ' || a."recipientType"::text || ' allocations for the same recipient on one transaction'
          FROM "revenue_allocations" a
         GROUP BY a."revenueTransactionId", a."recipientType", a."recipientId"
        HAVING COUNT(*) > 1
        UNION ALL
        SELECT i."sourceId"::text,
               COUNT(*)::text || ' live payout items settle the same ledger line'
          FROM "payout_items" i
         WHERE i."releasedAt" IS NULL
         GROUP BY i."sourceKind", i."sourceId"
        HAVING COUNT(*) > 1
      ) d`,
  },
  {
    code: 'UNBALANCED_TRANSACTION',
    title: 'Allocations do not add up to the transaction',
    description: 'Platform + teacher allocations must equal the transaction amount exactly (membership payments are pooled, so excluded).',
    severity: 'CRITICAL',
    sql: `
      SELECT t."id"::text AS "reference",
             'Allocations total ' || COALESCE(s."total", 0)::text || ' but the transaction is ' || t."amount"::text AS "detail",
             t."amount"::text AS "amount"
        FROM "revenue_transactions" t
        LEFT JOIN LATERAL (
          SELECT SUM(a."amount") AS "total" FROM "revenue_allocations" a WHERE a."revenueTransactionId" = t."id"
        ) s ON true
        LEFT JOIN "revenue_transactions" o ON o."id" = t."reversesTransactionId"
       WHERE t."transactionType"::text <> 'MEMBERSHIP_PAYMENT'
         AND COALESCE(o."transactionType"::text, '') <> 'MEMBERSHIP_PAYMENT'
         AND COALESCE(s."total", 0) <> t."amount"
       ORDER BY t."occurredAt" DESC`,
  },
  {
    code: 'AMOUNT_MISMATCH',
    title: 'Amounts differ between payment and ledger',
    description: 'A payment total that differs from its items, or a ledger amount that differs from its payment item.',
    severity: 'CRITICAL',
    sql: `
      SELECT d."reference", d."detail", d."amount" FROM (
        SELECT p."id"::text AS "reference",
               'Payment amount ' || p."amount"::text || ' differs from the sum of its items (' || s."total"::text || ')' AS "detail",
               p."amount"::text AS "amount"
          FROM "payments" p
          JOIN LATERAL (
            SELECT COALESCE(SUM(i."amount" * i."quantity"), 0) AS "total" FROM "payment_items" i WHERE i."paymentId" = p."id"
          ) s ON true
         WHERE p."status"::text = 'paid' AND s."total" <> p."amount"
        UNION ALL
        SELECT t."id"::text,
               'Ledger amount differs from the payment item line total (' || (i."amount" * i."quantity")::text || ')',
               t."amount"::text
          FROM "revenue_transactions" t
          JOIN "payment_items" i ON i."id" = t."paymentItemId"
         WHERE t."transactionType"::text IN ('COURSE_PURCHASE', 'MEMBERSHIP_PAYMENT')
           AND t."amount" <> i."amount" * i."quantity"
      ) d`,
  },
  {
    code: 'REFUND_WITHOUT_REVERSAL',
    title: 'Refund without a matching reversal',
    description: 'Refund records without reversal rows, reversals that do not mirror the refund, over-reversed purchases, or orphan reversal rows.',
    severity: 'CRITICAL',
    sql: `
      SELECT d."reference", d."detail", d."amount" FROM (
        SELECT r."id"::text AS "reference", 'Refund has no revenue reversal rows' AS "detail", r."amount"::text AS "amount"
          FROM "refunds" r
         WHERE NOT EXISTS (SELECT 1 FROM "refund_items" ri WHERE ri."refundId" = r."id")
        UNION ALL
        SELECT r."id"::text, 'Refund items total ' || s."total"::text || ' but the refund is ' || r."amount"::text, r."amount"::text
          FROM "refunds" r
          JOIN LATERAL (SELECT COALESCE(SUM(ri."amount"), 0) AS "total" FROM "refund_items" ri WHERE ri."refundId" = r."id") s ON true
         WHERE s."total" <> 0 AND s."total" <> r."amount"
        UNION ALL
        SELECT ri."id"::text, 'Reversal transaction does not mirror the refund item', ri."amount"::text
          FROM "refund_items" ri
          JOIN "revenue_transactions" rt ON rt."id" = ri."reversalTransactionId"
         WHERE rt."amount" <> -ri."amount" OR rt."reversesTransactionId" IS DISTINCT FROM ri."revenueTransactionId"
        UNION ALL
        SELECT o."id"::text, 'Purchase has been reversed by more than its original amount', o."amount"::text
          FROM "revenue_transactions" o
          JOIN LATERAL (
            SELECT COALESCE(SUM(x."amount"), 0) AS "total" FROM "revenue_transactions" x WHERE x."reversesTransactionId" = o."id"
          ) s ON true
         WHERE o."amount" > 0 AND o."amount" + s."total" < 0
        UNION ALL
        SELECT t."id"::text, 'Refund/chargeback ledger row has no refund record', t."amount"::text
          FROM "revenue_transactions" t
         WHERE t."transactionType"::text IN ('REFUND', 'CHARGEBACK')
           AND NOT EXISTS (SELECT 1 FROM "refund_items" ri WHERE ri."reversalTransactionId" = t."id")
      ) d`,
  },
  {
    code: 'SUBSCRIPTION_WITHOUT_ACTIVATION',
    title: 'Subscription payment without membership activation',
    description: 'A membership payment in the ledger with no activated subscription period (or the reverse, or different amounts).',
    severity: 'CRITICAL',
    sql: `
      SELECT d."reference", d."detail", d."amount" FROM (
        SELECT t."id"::text AS "reference",
               'Membership payment is in the ledger but no subscription period was activated' AS "detail",
               t."amount"::text AS "amount"
          FROM "revenue_transactions" t
         WHERE t."transactionType"::text = 'MEMBERSHIP_PAYMENT'
           AND NOT EXISTS (SELECT 1 FROM "subscription_payments" sp WHERE sp."paymentItemId" = t."paymentItemId")
        UNION ALL
        SELECT sp."id"::text, 'Subscription period was activated but the payment has no ledger row', sp."amount"::text
          FROM "subscription_payments" sp
         WHERE NOT EXISTS (
           SELECT 1 FROM "revenue_transactions" t
            WHERE t."paymentItemId" = sp."paymentItemId" AND t."transactionType"::text = 'MEMBERSHIP_PAYMENT'
         )
        UNION ALL
        SELECT sp."id"::text, 'Subscription period amount differs from the ledger amount (' || t."amount"::text || ')', sp."amount"::text
          FROM "subscription_payments" sp
          JOIN "revenue_transactions" t ON t."paymentItemId" = sp."paymentItemId" AND t."transactionType"::text = 'MEMBERSHIP_PAYMENT'
         WHERE t."amount" <> sp."amount"
      ) d`,
  },
  {
    code: 'PAYOUT_MISMATCH',
    title: 'Incorrect payout',
    description: 'Payout lines that do not add up, differ from the ledger / frozen allocation they settle, or belong to another teacher.',
    severity: 'CRITICAL',
    sql: `
      SELECT d."reference", d."detail", d."amount" FROM (
        SELECT y."id"::text AS "reference",
               'Payout lines total ' || s."total"::text || ' but the payout is ' || y."amount"::text AS "detail",
               y."amount"::text AS "amount"
          FROM "payouts" y
          JOIN LATERAL (SELECT COALESCE(SUM(i."amount"), 0) AS "total" FROM "payout_items" i WHERE i."payoutId" = y."id") s ON true
         WHERE s."total" <> y."amount"
        UNION ALL
        SELECT i."id"::text, 'Course payout line differs from its ledger allocation (or the allocation is missing)', i."amount"::text
          FROM "payout_items" i
          LEFT JOIN "revenue_allocations" a ON a."id" = i."sourceId"
         WHERE i."sourceKind"::text = 'COURSE_ALLOCATION' AND (a."id" IS NULL OR a."amount" <> i."amount")
        UNION ALL
        SELECT i."id"::text, 'Membership payout line differs from the frozen period allocation (or it is missing)', i."amount"::text
          FROM "payout_items" i
          LEFT JOIN "membership_period_allocations" a ON a."id" = i."sourceId"
         WHERE i."sourceKind"::text = 'MEMBERSHIP_ALLOCATION' AND (a."id" IS NULL OR a."amount" <> i."amount")
        UNION ALL
        SELECT i."id"::text, 'Payout line belongs to a different teacher than the payout', i."amount"::text
          FROM "payout_items" i
          JOIN "payouts" y ON y."id" = i."payoutId"
          LEFT JOIN "revenue_allocations" ca ON i."sourceKind"::text = 'COURSE_ALLOCATION' AND ca."id" = i."sourceId"
          LEFT JOIN "membership_period_allocations" ma ON i."sourceKind"::text = 'MEMBERSHIP_ALLOCATION' AND ma."id" = i."sourceId"
         WHERE COALESCE(ca."recipientId", ma."teacherId") IS NOT NULL
           AND COALESCE(ca."recipientId", ma."teacherId") IS DISTINCT FROM y."teacherId"
      ) d`,
  },
  {
    code: 'PERIOD_DRIFT',
    title: 'Finalized period differs from its frozen calculation',
    description: 'A FINALIZED / PAYOUT_PROCESSING / PAID period whose amounts, teacher allocations or live membership payments no longer match the frozen calculation.',
    severity: 'CRITICAL',
    sql: `
      SELECT d."reference", d."detail", d."amount" FROM (
        SELECT p."id"::text AS "reference",
               'Period ' || p."periodStart"::text || ' amounts differ from its frozen calculation' AS "detail",
               p."teacherPool"::text AS "amount"
          FROM "revenue_periods" p
          JOIN "revenue_period_calculations" c ON c."id" = p."finalCalculationId"
         WHERE p."status"::text IN (${LOCKED_SQL})
           AND (p."grossRevenue" <> c."grossRevenue" OR p."eligibleRevenue" <> c."eligibleRevenue"
                OR p."platformRevenue" <> c."platformRevenue" OR p."teacherPool" <> c."teacherPool")
        UNION ALL
        SELECT p."id"::text,
               'Period ' || p."periodStart"::text || ': teacher allocations total ' || s."total"::text || ' but the frozen distributed amount is ' || c."distributedAmount"::text,
               c."distributedAmount"::text
          FROM "revenue_periods" p
          JOIN "revenue_period_calculations" c ON c."id" = p."finalCalculationId"
          JOIN LATERAL (
            SELECT COALESCE(SUM(a."amount"), 0) AS "total" FROM "membership_period_allocations" a WHERE a."calculationId" = c."id"
          ) s ON true
         WHERE p."status"::text IN (${LOCKED_SQL}) AND s."total" <> c."distributedAmount"
        UNION ALL
        SELECT p."id"::text,
               'Period ' || p."periodStart"::text || ': live membership payments are ' || s."total"::text || ' but the frozen gross is ' || c."grossRevenue"::text,
               c."grossRevenue"::text
          FROM "revenue_periods" p
          JOIN "revenue_period_calculations" c ON c."id" = p."finalCalculationId"
          JOIN LATERAL (
            SELECT COALESCE(SUM(t."amount"), 0) AS "total" FROM "revenue_transactions" t
             WHERE t."periodId" = p."id" AND t."transactionType"::text = 'MEMBERSHIP_PAYMENT'
          ) s ON true
         WHERE p."status"::text IN (${LOCKED_SQL}) AND s."total" <> c."grossRevenue"
      ) d`,
  },
  {
    code: 'FAILED_PAYOUT',
    title: 'Failed or stuck payout',
    description: 'Payouts in FAILED status, or PROCESSING for more than 7 days. Needs an admin decision (retry or cancel).',
    severity: 'WARNING',
    sql: `
      SELECT y."id"::text AS "reference",
             CASE WHEN y."status"::text = 'FAILED'
                  THEN 'Payout failed: ' || COALESCE(y."failureReason", 'no reason recorded')
                  ELSE 'Payout has been PROCESSING for more than 7 days' END AS "detail",
             y."amount"::text AS "amount"
        FROM "payouts" y
       WHERE y."status"::text = 'FAILED'
          OR (y."status"::text = 'PROCESSING' AND y."processingAt" < now() - interval '7 days')
       ORDER BY y."requestedAt" DESC`,
  },
  {
    code: 'PENDING_PAYOUT_AGING',
    title: 'Payout requests waiting more than 14 days',
    description: 'Teacher requests that nobody has approved or rejected for over two weeks.',
    severity: 'WARNING',
    sql: `
      SELECT y."id"::text AS "reference",
             'Payout request has been waiting since ' || to_char(y."requestedAt", 'YYYY-MM-DD') AS "detail",
             y."amount"::text AS "amount"
        FROM "payouts" y
       WHERE y."status"::text = 'PENDING' AND y."requestedAt" < now() - interval '14 days'
       ORDER BY y."requestedAt" ASC`,
  },
  {
    code: 'ZERO_PRICE_PAID_ITEM',
    title: 'Paid payment with an unattributable course',
    description: 'A PAID course item whose course no longer exists, so no teacher can be credited.',
    severity: 'WARNING',
    sql: `
      SELECT i."id"::text AS "reference",
             'Course ' || i."referenceId" || ' of paid payment ' || p."id"::text || ' no longer exists' AS "detail",
             (i."amount" * i."quantity")::text AS "amount"
        FROM "payment_items" i
        JOIN "payments" p ON p."id" = i."paymentId"
       WHERE p."status"::text = 'paid' AND i."referenceType" = 'course_enrollment'
         AND NOT EXISTS (SELECT 1 FROM "courses" c WHERE c."id"::text = i."referenceId")`,
  },
];

// Teacher ledger net (course allocations + frozen membership allocations of locked periods).
export const LEDGER_NET_SQL = `
  SELECT x."teacherId"::text AS "teacherId", SUM(x."amount")::text AS "net"
    FROM (
      SELECT a."recipientId" AS "teacherId", a."amount"
        FROM "revenue_allocations" a
       WHERE a."recipientType"::text = 'TEACHER' AND a."sourceType"::text = 'COURSE_PURCHASE'
      UNION ALL
      SELECT m."teacherId", m."amount"
        FROM "membership_period_allocations" m
        JOIN "revenue_periods" p ON p."id" = m."periodId" AND p."finalCalculationId" = m."calculationId"
       WHERE p."status"::text IN (${LOCKED_SQL})
    ) x
   GROUP BY x."teacherId"`;

export const PAID_PAYOUT_SQL = `
  SELECT y."teacherId"::text AS "teacherId", SUM(i."amount")::text AS "paid"
    FROM "payout_items" i
    JOIN "payouts" y ON y."id" = i."payoutId"
   WHERE i."releasedAt" IS NULL AND y."status"::text = 'PAID'
   GROUP BY y."teacherId"`;

// Five-way totals: payments vs ledger vs allocations vs teacher earnings vs payouts.
export const FIGURES_SQL = `
  SELECT
    (SELECT COALESCE(SUM(i."amount" * i."quantity"), 0) FROM "payment_items" i JOIN "payments" p ON p."id" = i."paymentId"
      WHERE p."status"::text = 'paid' AND i."referenceType" IN ('course_enrollment', 'membership_plan'))::text AS "paymentsTotal",
    (SELECT COALESCE(SUM(t."amount"), 0) FROM "revenue_transactions" t
      WHERE t."transactionType"::text IN ('COURSE_PURCHASE', 'MEMBERSHIP_PAYMENT'))::text AS "ledgerGross",
    (SELECT COALESCE(-SUM(t."amount"), 0) FROM "revenue_transactions" t
      WHERE t."transactionType"::text IN ('REFUND', 'CHARGEBACK'))::text AS "ledgerReversals",
    (SELECT COALESCE(SUM(t."amount"), 0) FROM "revenue_transactions" t
       LEFT JOIN "revenue_transactions" o ON o."id" = t."reversesTransactionId"
      WHERE t."transactionType"::text = 'COURSE_PURCHASE'
         OR (t."transactionType"::text IN ('REFUND', 'CHARGEBACK', 'ADJUSTMENT') AND COALESCE(o."transactionType"::text, '') <> 'MEMBERSHIP_PAYMENT'))::text AS "courseLedgerNet",
    (SELECT COALESCE(SUM(a."amount"), 0) FROM "revenue_allocations" a)::text AS "allocatedTotal",
    (SELECT COALESCE(SUM(a."amount"), 0) FROM "revenue_allocations" a WHERE a."recipientType"::text = 'PLATFORM')::text AS "platformCourse",
    (SELECT COALESCE(SUM(a."amount"), 0) FROM "revenue_allocations" a WHERE a."recipientType"::text = 'TEACHER')::text AS "teacherCourse",
    (SELECT COALESCE(SUM(m."amount"), 0) FROM "membership_period_allocations" m
       JOIN "revenue_periods" p ON p."id" = m."periodId" AND p."finalCalculationId" = m."calculationId"
      WHERE p."status"::text IN (${LOCKED_SQL}))::text AS "teacherMembership",
    (SELECT COALESCE(SUM(c."platformRevenue"), 0) FROM "revenue_periods" p
       JOIN "revenue_period_calculations" c ON c."id" = p."finalCalculationId"
      WHERE p."status"::text IN (${LOCKED_SQL}))::text AS "platformMembership",
    (SELECT COALESCE(SUM("amount"), 0) FROM "payouts" WHERE "status"::text = 'PAID')::text AS "payoutsPaid",
    (SELECT COALESCE(SUM("amount"), 0) FROM "payouts" WHERE "status"::text IN ('PENDING', 'APPROVED', 'PROCESSING', 'FAILED'))::text AS "payoutsInFlight"`;