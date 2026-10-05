import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RevenueSourceType } from '../finance/finance.enums';
import { fromPaise, percentToBps, toPaise } from '../finance/money.util';
import { splitAmount } from '../finance/revenue-calculator';
import { RevenueRulesService } from '../finance/revenue-rules.service';

/**
 * READ-ONLY view of membership money by revenue period.
 * Phase R7 only POOLS the money. The real 30/70 split, refunds/chargebacks and the per-teacher
 * distribution are calculated and frozen in Phase R10 - so the LMS / teacher-pool figures here are
 * a PROJECTION from the rule in force at period end, and are labelled that way in the API.
 */
@Injectable()
export class MembershipRevenueService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rules: RevenueRulesService,
  ) {}

  async listPeriods() {
    const rows: { id: string; periodStart: string; periodEnd: string; status: string; payments: string; gross: string }[] =
      await this.dataSource.query(`
        SELECT p."id", p."periodStart"::text AS "periodStart", p."periodEnd"::text AS "periodEnd",
               p."status"::text AS "status",
               COUNT(t."id") AS "payments", COALESCE(SUM(t."amount"), 0) AS "gross"
          FROM "revenue_periods" p
          LEFT JOIN "revenue_transactions" t
                 ON t."periodId" = p."id" AND t."transactionType" = 'MEMBERSHIP_PAYMENT'
         GROUP BY p."id"
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
  projectedPlatformShare: string;
  projectedTeacherPool: string;
  appliedRule: {
    platformPercentage: string;
    teacherPercentage: string;
  };
  projectionOnly: boolean;
}[] = [];

    for (const row of rows) {
      const rule = await this.rules.getEffectiveRule(
        RevenueSourceType.MEMBERSHIP_POOL,
        new Date(`${row.periodEnd}T23:59:59+05:30`),
      );
      const grossPaise = toPaise(row.gross);
      let platformPaise = 0n;
      let poolPaise = 0n;
      if (grossPaise > 0n) {
        const split = splitAmount(grossPaise, percentToBps(rule.platformPercentage), percentToBps(rule.teacherPercentage));
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
        projectedPlatformShare: fromPaise(platformPaise),
        projectedTeacherPool: fromPaise(poolPaise),
        appliedRule: { platformPercentage: rule.platformPercentage, teacherPercentage: rule.teacherPercentage },
        projectionOnly: true, // final, frozen figures arrive with Phase R10
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