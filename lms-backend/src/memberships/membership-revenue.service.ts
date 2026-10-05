import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RevenueSourceType } from '../finance/finance.enums';
import { fromPaise, percentToBps, toPaise } from '../finance/money.util';
import { splitAmount } from '../finance/revenue-calculator';
import { RevenueRulesService } from '../finance/revenue-rules.service';

/**
 * READ-ONLY view of membership money by revenue period.
 * - FINALIZED / PAYOUT_PROCESSING / PAID periods return the FROZEN figures from Phase R10.
 * - Earlier periods return a PROJECTION (gross minus refunds, split by the rule in force at period end,
 *   before any tax) and are labelled projectionOnly: true.
 */
@Injectable()
export class MembershipRevenueService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rules: RevenueRulesService,
  ) {}

  async listPeriods() {
    const rows: {
      id: string;
      periodStart: string;
      periodEnd: string;
      status: string;
      payments: string;
      gross: string;
      refunds: string;
      frozenPlatform: string | null;
      frozenPool: string | null;
      frozenPlatformPct: string | null;
      frozenTeacherPct: string | null;
    }[] = await this.dataSource.query(`
      SELECT p."id", p."periodStart"::text AS "periodStart", p."periodEnd"::text AS "periodEnd", p."status"::text AS "status",
             COUNT(t."id") FILTER (WHERE t."transactionType" = 'MEMBERSHIP_PAYMENT') AS "payments",
             COALESCE(SUM(t."amount") FILTER (WHERE t."transactionType" = 'MEMBERSHIP_PAYMENT'), 0) AS "gross",
             COALESCE(-SUM(t."amount") FILTER (WHERE t."transactionType" IN ('REFUND','CHARGEBACK')), 0) AS "refunds",
             fc."platformRevenue"::text AS "frozenPlatform", fc."teacherPool"::text AS "frozenPool",
             fc."platformPercentage"::text AS "frozenPlatformPct", fc."teacherPercentage"::text AS "frozenTeacherPct"
        FROM "revenue_periods" p
        LEFT JOIN "revenue_period_calculations" fc ON fc."id" = p."finalCalculationId"
        LEFT JOIN "revenue_transactions" t ON t."periodId" = p."id"
        LEFT JOIN "revenue_transactions" o ON o."id" = t."reversesTransactionId"
       WHERE t."id" IS NULL
          OR t."transactionType" = 'MEMBERSHIP_PAYMENT'
          OR (t."transactionType" IN ('REFUND','CHARGEBACK') AND o."transactionType" = 'MEMBERSHIP_PAYMENT')
       GROUP BY p."id", fc."id"
       ORDER BY p."periodStart" DESC
       LIMIT 36
    `);

    const periods: {
      periodId: string;
      periodStart: string;
      periodEnd: string;
      status: string;
      payments: number;
      grossMembershipRevenue: string;
      refundsAmount: string;
      projectedPlatformShare: string;
      projectedTeacherPool: string;
      appliedRule: { platformPercentage: string; teacherPercentage: string };
      projectionOnly: boolean;
    }[] = [];

    for (const row of rows) {
      const grossPaise = toPaise(row.gross);
      const refundsPaise = toPaise(row.refunds);

      if (row.frozenPlatform !== null && row.frozenPool !== null) {
        periods.push({
          periodId: row.id,
          periodStart: row.periodStart,
          periodEnd: row.periodEnd,
          status: row.status,
          payments: Number(row.payments),
          grossMembershipRevenue: fromPaise(grossPaise),
          refundsAmount: fromPaise(refundsPaise),
          projectedPlatformShare: row.frozenPlatform,
          projectedTeacherPool: row.frozenPool,
          appliedRule: { platformPercentage: row.frozenPlatformPct as string, teacherPercentage: row.frozenTeacherPct as string },
          projectionOnly: false, // frozen by Phase R10
        });
        continue;
      }

      const rule = await this.rules.getEffectiveRule(RevenueSourceType.MEMBERSHIP_POOL, new Date(`${row.periodEnd}T23:59:59+05:30`));
      const netPaise = grossPaise - refundsPaise;
      let platformPaise = 0n;
      let poolPaise = 0n;
      if (netPaise > 0n) {
        const split = splitAmount(netPaise, percentToBps(rule.platformPercentage), percentToBps(rule.teacherPercentage));
        platformPaise = split.platformPaise;
        poolPaise = split.teacherPaise;
      }

      periods.push({
        periodId: row.id,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        status: row.status,
        payments: Number(row.payments),
        grossMembershipRevenue: fromPaise(grossPaise),
        refundsAmount: fromPaise(refundsPaise),
        projectedPlatformShare: fromPaise(platformPaise),
        projectedTeacherPool: fromPaise(poolPaise),
        appliedRule: { platformPercentage: rule.platformPercentage, teacherPercentage: rule.teacherPercentage },
        projectionOnly: true,
      });
    }
    return periods;
  }

  paymentsInPeriod(periodId: string, limit: number, offset: number) {
    return this.dataSource.query(
      `SELECT t."id" AS "transactionId", t."amount", t."currency", t."occurredAt", t."paymentId",
              u."name" AS "studentName", u."email" AS "studentEmail",
              pl."name" AS "planName",
              sp."periodStart" AS "paidFrom", sp."periodEnd" AS "paidUntil",
              s."status"::text AS "subscriptionStatus"
         FROM "revenue_transactions" t
         LEFT JOIN "users" u ON u."id" = t."studentId"
         LEFT JOIN "subscription_payments" sp ON sp."paymentItemId" = t."paymentItemId"
         LEFT JOIN "subscriptions" s ON s."id" = sp."subscriptionId"
         LEFT JOIN "membership_plans" pl ON pl."id" = s."membershipPlanId"
        WHERE t."periodId" = $1 AND t."transactionType" = 'MEMBERSHIP_PAYMENT'
        ORDER BY t."occurredAt" DESC
        LIMIT $2 OFFSET $3`,
      [periodId, limit, offset],
    );
  }
}