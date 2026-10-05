import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { ACCESS_SUBSCRIPTION_STATUSES, SubscriptionStatus } from './memberships.enums';

export interface MySubscriptionRow {
  id: string;
  status: SubscriptionStatus;
  planId: string;
  planName: string;
  price: string;
  currency: string;
  startDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  hasAccess: boolean;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription) private readonly subRepo: Repository<Subscription>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Lazy lifecycle: moves subscriptions whose paid period has ended to a terminal status.
   * (cancelAtPeriodEnd -> CANCELLED, otherwise it simply lapsed -> EXPIRED.)
   * Access never relies on this - the access query also checks currentPeriodEnd > now().
   * A scheduled job can call this later; for now reads trigger it.
   */
  async expireDue(): Promise<void> {
    await this.dataSource.query(`
      UPDATE "subscriptions"
         SET "status" = CASE WHEN "cancelAtPeriodEnd" THEN 'CANCELLED'::subscription_status
                             ELSE 'EXPIRED'::subscription_status END,
             "updatedAt" = now()
       WHERE "status" IN ('ACTIVE','TRIALING','PAST_DUE') AND "currentPeriodEnd" <= now()
    `);
  }

  async listMine(studentId: string): Promise<MySubscriptionRow[]> {
    await this.expireDue();
    return this.dataSource.query(
      `SELECT s."id", s."status"::text AS "status", s."membershipPlanId" AS "planId",
              p."name" AS "planName", p."price"::text AS "price", p."currency",
              s."startDate", s."currentPeriodStart", s."currentPeriodEnd",
              s."cancelAtPeriodEnd", s."cancelledAt",
              (s."status" IN ('ACTIVE','TRIALING') AND s."currentPeriodEnd" > now()) AS "hasAccess"
         FROM "subscriptions" s
         JOIN "membership_plans" p ON p."id" = s."membershipPlanId"
        WHERE s."studentId" = $1
        ORDER BY s."createdAt" DESC`,
      [studentId],
    );
  }

  async findMineByIds(studentId: string, ids: string[]): Promise<MySubscriptionRow[]> {
    const rows = await this.listMine(studentId);
    return rows.filter((row) => ids.includes(row.id));
  }

  /** Student stops auto-renew intent: access continues until currentPeriodEnd. Ownership enforced in the query. */
  async cancel(studentId: string, subscriptionId: string) {
    await this.expireDue();
    const sub = await this.subRepo.findOne({ where: { id: subscriptionId, studentId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    this.assertLive(sub);

    if (!sub.cancelAtPeriodEnd) {
      await this.subRepo.update({ id: sub.id }, { cancelAtPeriodEnd: true, cancelledAt: new Date() });
    }
    return { id: sub.id, cancelAtPeriodEnd: true, accessUntil: sub.currentPeriodEnd };
  }

  async resume(studentId: string, subscriptionId: string) {
    await this.expireDue();
    const sub = await this.subRepo.findOne({ where: { id: subscriptionId, studentId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    this.assertLive(sub);

    if (sub.cancelAtPeriodEnd) {
      await this.subRepo.update({ id: sub.id }, { cancelAtPeriodEnd: false, cancelledAt: null });
    }
    return { id: sub.id, cancelAtPeriodEnd: false, accessUntil: sub.currentPeriodEnd };
  }

  // ───────────── admin reads ─────────────

  async listForAdmin(status: SubscriptionStatus | undefined, limit: number, offset: number) {
    await this.expireDue();
    const filter = status ?? null;

    const items = await this.dataSource.query(
      `SELECT s."id", s."status"::text AS "status",
              u."name" AS "studentName", u."email" AS "studentEmail",
              p."name" AS "planName", p."price"::text AS "price",
              s."startDate", s."currentPeriodEnd", s."cancelAtPeriodEnd", s."cancelledAt"
         FROM "subscriptions" s
         JOIN "users" u ON u."id" = s."studentId"
         JOIN "membership_plans" p ON p."id" = s."membershipPlanId"
        WHERE ($1::text IS NULL OR s."status"::text = $1)
        ORDER BY s."createdAt" DESC
        LIMIT $2 OFFSET $3`,
      [filter, limit, offset],
    );
    const [{ total }]: { total: string }[] = await this.dataSource.query(
      `SELECT COUNT(*) AS "total" FROM "subscriptions" s WHERE ($1::text IS NULL OR s."status"::text = $1)`,
      [filter],
    );

    return { items, total: Number(total), limit, offset };
  }

  async summaryForAdmin() {
    await this.expireDue();
    const [row]: Record<string, string>[] = await this.dataSource.query(`
      SELECT COUNT(*) AS "total",
             COUNT(*) FILTER (WHERE "status" IN ('ACTIVE','TRIALING') AND "currentPeriodEnd" > now()) AS "activeNow",
             COUNT(*) FILTER (WHERE "status" IN ('ACTIVE','TRIALING') AND "cancelAtPeriodEnd" AND "currentPeriodEnd" > now()) AS "cancellingAtPeriodEnd",
             COUNT(*) FILTER (WHERE "status" = 'PAST_DUE') AS "pastDue",
             COUNT(*) FILTER (WHERE "status" = 'PAUSED') AS "paused",
             COUNT(*) FILTER (WHERE "status" = 'CANCELLED') AS "cancelled",
             COUNT(*) FILTER (WHERE "status" = 'EXPIRED') AS "expired",
             COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '30 days') AS "newLast30Days"
        FROM "subscriptions"
    `);
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)]));
  }

  private assertLive(sub: Subscription): void {
    const live = ACCESS_SUBSCRIPTION_STATUSES.includes(sub.status) && sub.currentPeriodEnd.getTime() > Date.now();
    if (!live) throw new ConflictException('This subscription is not active');
  }
}