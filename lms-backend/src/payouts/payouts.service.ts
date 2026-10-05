import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { fromPaise, toPaise } from '../finance/money.util';
import { PayoutBalanceService } from './payout-balance.service';
import { PayoutSettingsService } from './payout-settings.service';
import { ELIGIBLE_LINES_SQL } from './payout.sql';
import { PayoutStatus } from './payouts.enums';

type Row = Record<string, any>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const shortRef = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase();
const errCode = (err: any): string | undefined => err?.code ?? err?.driverError?.code;

const PAYOUT_SELECT = `
  SELECT y."id", y."teacherId", u."name" AS "teacherName", u."email" AS "teacherEmail",
         y."amount"::text AS "amount", y."currency", y."status"::text AS "status", y."periodId", y."provider", y."providerPayoutId",
         y."itemCount", y."retryCount", y."requestedAt", y."approvedAt", y."processingAt", y."processedAt", y."failedAt", y."failureReason",
         y."rejectedAt", y."rejectionReason", y."reversedAt", y."reversalReason",
         ab."name" AS "approvedByName", rb."name" AS "rejectedByName"
    FROM "payouts" y
    JOIN "users" u ON u."id" = y."teacherId"
    LEFT JOIN "users" ab ON ab."id" = y."approvedById"
    LEFT JOIN "users" rb ON rb."id" = y."rejectedById"`;

@Injectable()
export class PayoutsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly settings: PayoutSettingsService,
    private readonly balances: PayoutBalanceService,
  ) {}

  // ───────────────────────── teacher: request ─────────────────────────

  /**
   * Settles EVERYTHING that is currently available for this teacher. The amount and the lines are chosen by the
   * backend; the request carries no body. The advisory lock serialises one teacher's requests, and the unique
   * indexes (one PENDING per teacher, one live payout per ledger line) are the database-level backstop.
   */
  async requestPayout(teacherId: string) {
    let payoutId: string;
    try {
      payoutId = await this.dataSource.transaction(async (m) => {
        await m.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`payout-request:${teacherId}`]);

        const open: Row[] = await m.query(`SELECT 1 FROM "payouts" WHERE "teacherId" = $1::uuid AND "status"::text = 'PENDING' LIMIT 1`, [teacherId]);
        if (open.length > 0) throw new ConflictException('You already have a payout request waiting for approval.');

        const settings = await this.settings.getEffective(m);
        const lines: Row[] = await m.query(ELIGIBLE_LINES_SQL, [teacherId, settings.holdDays]);
        if (lines.length === 0) throw new BadRequestException('You have no available balance to pay out yet.');

        const net = lines.reduce((sum, l) => sum + toPaise(l.amount), 0n);
        if (net <= 0n) throw new BadRequestException('Your available balance is not positive, so there is nothing to pay out.');
        if (net < toPaise(settings.minimumPayout)) {
          throw new BadRequestException(`Your available balance (${fromPaise(net)}) is below the minimum payout of ${settings.minimumPayout}.`);
        }

        const period: Row[] = await m.query(
          `SELECT "id" FROM "revenue_periods"
            WHERE "periodStart" <= (now() AT TIME ZONE 'Asia/Kolkata')::date AND "periodEnd" >= (now() AT TIME ZONE 'Asia/Kolkata')::date LIMIT 1`,
        );

        const inserted: { id: string }[] = await m.query(
          `INSERT INTO "payouts" ("teacherId","amount","periodId","settingsId","itemCount","requestedById")
           VALUES ($1::uuid,$2,$3,$4,$5,$1::uuid) RETURNING "id"`,
          [teacherId, fromPaise(net), period[0]?.id ?? null, settings.id, lines.length],
        );
        const id = inserted[0].id;

        await m.query(
          `INSERT INTO "payout_items" ("payoutId","sourceKind","sourceId","periodId","amount")
           SELECT $1::uuid, t.k::payout_item_kind, t.s, t.p, t.a
             FROM unnest($2::text[], $3::uuid[], $4::uuid[], $5::numeric[]) AS t(k, s, p, a)`,
          [id, lines.map((l) => l.kind), lines.map((l) => l.sourceId), lines.map((l) => l.periodId ?? null), lines.map((l) => l.amount)],
        );

        await this.logEvent(m, id, null, PayoutStatus.PENDING, teacherId, 'TEACHER', 'Payout requested');
        return id;
      });
    } catch (err) {
      if (errCode(err) === '23505') throw new ConflictException('A payout request is already in progress. Please refresh and try again.');
      throw err;
    }
    return this.getDetail(payoutId, { teacherId });
  }

  // ───────────────────────── admin: lifecycle actions ─────────────────────────

  approve(payoutId: string, adminId: string) {
    return this.act(payoutId, async (m, p) => {
      if (p.status === PayoutStatus.APPROVED) return; // idempotent
      this.expect(p, [PayoutStatus.PENDING], 'approved');
      await m.query(`UPDATE "payouts" SET "status" = 'APPROVED', "approvedAt" = now(), "approvedById" = $2, "updatedAt" = now() WHERE "id" = $1`, [p.id, adminId]);
      await this.logEvent(m, p.id, p.status, PayoutStatus.APPROVED, adminId, 'ADMIN', 'Approved');
    });
  }

  /** Rejects a request, or cancels a FAILED payout. The ledger lines go back to "available". */
  reject(payoutId: string, adminId: string, reason: string) {
    return this.act(payoutId, async (m, p) => {
      if (p.status === PayoutStatus.REJECTED) return;
      this.expect(p, [PayoutStatus.PENDING, PayoutStatus.APPROVED, PayoutStatus.FAILED], 'rejected');
      await m.query(
        `UPDATE "payouts" SET "status" = 'REJECTED', "rejectedAt" = now(), "rejectedById" = $2, "rejectionReason" = $3, "updatedAt" = now() WHERE "id" = $1`,
        [p.id, adminId, reason],
      );
      await this.releaseItems(m, p.id);
      await this.logEvent(m, p.id, p.status, PayoutStatus.REJECTED, adminId, 'ADMIN', reason);
    });
  }

  startProcessing(payoutId: string, adminId: string) {
    return this.act(payoutId, async (m, p) => {
      if (p.status === PayoutStatus.PROCESSING) return;
      this.expect(p, [PayoutStatus.APPROVED], 'started');
      await m.query(`UPDATE "payouts" SET "status" = 'PROCESSING', "processingAt" = now(), "updatedAt" = now() WHERE "id" = $1`, [p.id]);
      await this.logEvent(m, p.id, p.status, PayoutStatus.PROCESSING, adminId, 'ADMIN', 'Processing started');
      await this.syncPeriods(m, p.id);
    });
  }

  retry(payoutId: string, adminId: string) {
    return this.act(payoutId, async (m, p) => {
      if (p.status === PayoutStatus.PROCESSING) return;
      this.expect(p, [PayoutStatus.FAILED], 'retried');
      await m.query(`UPDATE "payouts" SET "status" = 'PROCESSING', "processingAt" = now(), "retryCount" = "retryCount" + 1, "updatedAt" = now() WHERE "id" = $1`, [p.id]);
      await this.logEvent(m, p.id, p.status, PayoutStatus.PROCESSING, adminId, 'ADMIN', `Retry #${Number(p.retryCount) + 1}`);
    });
  }

  markPaid(payoutId: string, adminId: string, providerPayoutId: string, note?: string) {
    return this.act(payoutId, async (m, p) => {
      if (p.status === PayoutStatus.PAID) {
        if (p.providerPayoutId === providerPayoutId) return; // same call again: same result
        throw new ConflictException('This payout is already paid with a different bank reference.');
      }
      this.expect(p, [PayoutStatus.PROCESSING], 'marked paid');
      try {
        await m.query(
          `UPDATE "payouts" SET "status" = 'PAID', "processedAt" = now(), "providerPayoutId" = $2, "updatedAt" = now() WHERE "id" = $1`,
          [p.id, providerPayoutId],
        );
      } catch (err) {
        if (errCode(err) === '23505') throw new ConflictException('That bank reference was already used for another payout.');
        throw err;
      }
      await this.logEvent(m, p.id, p.status, PayoutStatus.PAID, adminId, 'ADMIN', note ? `Paid (ref ${providerPayoutId}) - ${note}` : `Paid (ref ${providerPayoutId})`);
      await this.syncPeriods(m, p.id);
    });
  }

  markFailed(payoutId: string, adminId: string, reason: string) {
    return this.act(payoutId, async (m, p) => {
      if (p.status === PayoutStatus.FAILED) return;
      this.expect(p, [PayoutStatus.PROCESSING], 'marked failed');
      await m.query(`UPDATE "payouts" SET "status" = 'FAILED', "failedAt" = now(), "failureReason" = $2, "updatedAt" = now() WHERE "id" = $1`, [p.id, reason]);
      await this.logEvent(m, p.id, p.status, PayoutStatus.FAILED, adminId, 'ADMIN', reason);
    });
  }

  /** The bank returned the money. The lines become available again; nothing is deleted. */
  reverse(payoutId: string, adminId: string, reason: string) {
    return this.act(payoutId, async (m, p) => {
      if (p.status === PayoutStatus.REVERSED) return;
      this.expect(p, [PayoutStatus.PAID], 'reversed');
      await m.query(
        `UPDATE "payouts" SET "status" = 'REVERSED', "reversedAt" = now(), "reversedById" = $2, "reversalReason" = $3, "updatedAt" = now() WHERE "id" = $1`,
        [p.id, adminId, reason],
      );
      await this.releaseItems(m, p.id);
      await this.logEvent(m, p.id, p.status, PayoutStatus.REVERSED, adminId, 'ADMIN', reason);
    });
  }

  // ───────────────────────── reads ─────────────────────────

  async listPayouts(opts: { status?: string; teacherId?: string; limit: number; offset: number }, admin: boolean) {
    if (opts.status && !Object.values(PayoutStatus).includes(opts.status as PayoutStatus)) throw new BadRequestException('Unknown payout status');
    if (opts.teacherId && !UUID_RE.test(opts.teacherId)) throw new BadRequestException('Invalid teacher id');

    const params = [opts.status ?? null, opts.teacherId ?? null];
    const where = `WHERE ($1::text IS NULL OR y."status"::text = $1) AND ($2::uuid IS NULL OR y."teacherId" = $2::uuid)`;

    const rows: Row[] = await this.dataSource.query(
      `${PAYOUT_SELECT} ${where} ORDER BY y."requestedAt" DESC, y."id" ASC LIMIT $3 OFFSET $4`,
      [...params, opts.limit, opts.offset],
    );
    const total: Row[] = await this.dataSource.query(`SELECT COUNT(*)::int AS "n" FROM "payouts" y ${where}`, params);

    const result: Record<string, unknown> = {
      payouts: rows.map((r) => this.mapPayout(r, admin)),
      paging: { limit: opts.limit, offset: opts.offset, total: Number(total[0].n) },
    };
    if (admin) {
      const summary: Row[] = await this.dataSource.query(
        `SELECT "status"::text AS "status", COUNT(*)::int AS "count", COALESCE(SUM("amount"), 0)::text AS "amount" FROM "payouts" GROUP BY "status"`,
      );
      result.summary = summary.map((s) => ({ status: s.status, count: Number(s.count), amount: s.amount }));
    }
    return result;
  }

  /** One payout with its lines and history. When `teacherId` is given it must own the payout (otherwise 404). */
  async getDetail(payoutId: string, scope: { teacherId?: string } = {}) {
    if (!UUID_RE.test(payoutId)) throw new BadRequestException('Invalid payout id');
    const admin = !scope.teacherId;

    const rows: Row[] = await this.dataSource.query(
      `${PAYOUT_SELECT} WHERE y."id" = $1::uuid AND ($2::uuid IS NULL OR y."teacherId" = $2::uuid)`,
      [payoutId, scope.teacherId ?? null],
    );
    if (!rows[0]) throw new NotFoundException('Payout not found');

    const items: Row[] = await this.dataSource.query(
      `SELECT i."id", i."sourceKind"::text AS "sourceKind", i."amount"::text AS "amount", i."releasedAt",
              rt."id" AS "txId", rt."transactionType"::text AS "txType", rt."occurredAt" AS "txAt", c."title" AS "courseTitle",
              p."periodStart"::text AS "periodStart"
         FROM "payout_items" i
         LEFT JOIN "revenue_allocations" ra ON i."sourceKind"::text = 'COURSE_ALLOCATION' AND ra."id" = i."sourceId"
         LEFT JOIN "revenue_transactions" rt ON rt."id" = ra."revenueTransactionId"
         LEFT JOIN "courses" c ON c."id" = rt."courseId"
         LEFT JOIN "revenue_periods" p ON p."id" = i."periodId"
        WHERE i."payoutId" = $1::uuid
        ORDER BY rt."occurredAt" ASC NULLS LAST, i."id" ASC
        LIMIT 500`,
      [payoutId],
    );

    const events: Row[] = await this.dataSource.query(
      `SELECT e."fromStatus"::text AS "fromStatus", e."toStatus"::text AS "toStatus", e."actorRole", e."note", e."createdAt", u."name" AS "actorName"
         FROM "payout_events" e LEFT JOIN "users" u ON u."id" = e."actorId"
        WHERE e."payoutId" = $1::uuid ORDER BY e."createdAt" ASC, e."id" ASC`,
      [payoutId],
    );

    return {
      ...this.mapPayout(rows[0], admin),
      items: items.map((i) => ({
        id: i.id as string,
        kind: i.sourceKind as string,
        description:
          i.sourceKind === 'COURSE_ALLOCATION'
            ? `${i.txType === 'COURSE_PURCHASE' ? 'Course sale' : 'Refund adjustment'} - ${(i.courseTitle as string | null) ?? 'Deleted course'}`
            : `Membership pool - ${i.periodStart ? String(i.periodStart).slice(0, 7) : ''}`,
        reference: i.txId ? shortRef(i.txId as string) : null,
        occurredAt: (i.txAt as Date | null) ?? null,
        amount: i.amount as string,
        released: i.releasedAt !== null,
      })),
      events: events.map((e) =>
        admin
          ? { fromStatus: e.fromStatus, toStatus: e.toStatus, actorRole: e.actorRole, actorName: e.actorName, note: e.note, createdAt: e.createdAt }
          : { toStatus: e.toStatus, createdAt: e.createdAt }, // teachers see the timeline only
      ),
    };
  }

  /** Admin: one teacher's balance and complete payout history. */
  async teacherStatement(teacherId: string) {
    if (!UUID_RE.test(teacherId)) throw new BadRequestException('Invalid teacher id');
    const teacher: Row[] = await this.dataSource.query(`SELECT "id", "name", "email" FROM "users" WHERE "id" = $1::uuid AND "role"::text = 'teacher'`, [teacherId]);
    if (!teacher[0]) throw new NotFoundException('Teacher not found');

    const balance = await this.balances.getTeacherBalance(teacherId);
    const history = await this.listPayouts({ teacherId, limit: 100, offset: 0 }, true);
    return { teacher: teacher[0], balance, payouts: history.payouts };
  }

  // ───────────────────────── helpers ─────────────────────────

  /** Runs one lifecycle action on a ROW-LOCKED payout inside a transaction, then returns the fresh admin detail. */
  private async act(payoutId: string, handler: (m: EntityManager, payout: Row) => Promise<void>) {
    if (!UUID_RE.test(payoutId)) throw new BadRequestException('Invalid payout id');
    await this.dataSource.transaction(async (m) => {
      const rows: Row[] = await m.query(
        `SELECT "id", "status"::text AS "status", "providerPayoutId", "retryCount" FROM "payouts" WHERE "id" = $1 FOR UPDATE`,
        [payoutId],
      );
      if (!rows[0]) throw new NotFoundException('Payout not found');
      await handler(m, rows[0]);
    });
    return this.getDetail(payoutId);
  }

  private expect(payout: Row, allowed: PayoutStatus[], verb: string) {
    if (!allowed.includes(payout.status as PayoutStatus)) {
      throw new ConflictException(`A ${String(payout.status).toLowerCase()} payout cannot be ${verb}.`);
    }
  }

  private logEvent(m: EntityManager, payoutId: string, from: string | null, to: PayoutStatus, actorId: string, actorRole: 'ADMIN' | 'TEACHER', note: string) {
    return m.query(
      `INSERT INTO "payout_events" ("payoutId","fromStatus","toStatus","actorId","actorRole","note") VALUES ($1,$2::payout_status,$3::payout_status,$4,$5,$6)`,
      [payoutId, from, to, actorId, actorRole, note],
    );
  }

  private releaseItems(m: EntityManager, payoutId: string) {
    return m.query(`UPDATE "payout_items" SET "releasedAt" = now() WHERE "payoutId" = $1 AND "releasedAt" IS NULL`, [payoutId]);
  }

  /**
   * Keeps revenue_periods in step with payouts (membership lines only):
   *  FINALIZED          -> PAYOUT_PROCESSING  once any of its lines is in a PROCESSING/PAID payout
   *  PAYOUT_PROCESSING  -> PAID               once EVERY positive allocation of its final calculation is in a PAID payout
   * The R10 database guard only allows these forward moves and keeps all amounts frozen.
   */
  private async syncPeriods(m: EntityManager, payoutId: string) {
    const periods: Row[] = await m.query(`SELECT DISTINCT "periodId" FROM "payout_items" WHERE "payoutId" = $1 AND "periodId" IS NOT NULL`, [payoutId]);
    if (periods.length === 0) return;
    const ids = periods.map((p) => p.periodId as string);

    await m.query(
      `UPDATE "revenue_periods" p SET "status" = 'PAYOUT_PROCESSING', "updatedAt" = now()
        WHERE p."id" = ANY($1::uuid[]) AND p."status"::text = 'FINALIZED'
          AND EXISTS (
            SELECT 1 FROM "membership_period_allocations" a
              JOIN "payout_items" i ON i."sourceKind"::text = 'MEMBERSHIP_ALLOCATION' AND i."sourceId" = a."id" AND i."releasedAt" IS NULL
              JOIN "payouts" y ON y."id" = i."payoutId"
             WHERE a."calculationId" = p."finalCalculationId" AND y."status"::text IN ('PROCESSING','PAID')
          )`,
      [ids],
    );

    await m.query(
      `UPDATE "revenue_periods" p SET "status" = 'PAID', "updatedAt" = now()
        WHERE p."id" = ANY($1::uuid[]) AND p."status"::text = 'PAYOUT_PROCESSING'
          AND NOT EXISTS (
            SELECT 1 FROM "membership_period_allocations" a
             WHERE a."calculationId" = p."finalCalculationId" AND a."amount" > 0
               AND NOT EXISTS (
                 SELECT 1 FROM "payout_items" i JOIN "payouts" y ON y."id" = i."payoutId"
                  WHERE i."sourceKind"::text = 'MEMBERSHIP_ALLOCATION' AND i."sourceId" = a."id" AND i."releasedAt" IS NULL AND y."status"::text = 'PAID'
               )
          )`,
      [ids],
    );
  }

  private mapPayout(r: Row, admin: boolean) {
    const base = {
      id: r.id as string,
      amount: r.amount as string,
      currency: r.currency as string,
      status: r.status as PayoutStatus,
      provider: r.provider as string,
      providerPayoutId: (r.providerPayoutId as string | null) ?? null,
      itemCount: Number(r.itemCount),
      requestedAt: r.requestedAt as Date,
      approvedAt: (r.approvedAt as Date | null) ?? null,
      processingAt: (r.processingAt as Date | null) ?? null,
      paidAt: (r.processedAt as Date | null) ?? null,
      failedAt: (r.failedAt as Date | null) ?? null,
      failureReason: (r.failureReason as string | null) ?? null,
      rejectedAt: (r.rejectedAt as Date | null) ?? null,
      rejectionReason: (r.rejectionReason as string | null) ?? null,
      reversedAt: (r.reversedAt as Date | null) ?? null,
      reversalReason: (r.reversalReason as string | null) ?? null,
    };
    if (!admin) return base;
    return {
      ...base,
      teacher: { id: r.teacherId as string, name: r.teacherName as string, email: r.teacherEmail as string },
      periodId: (r.periodId as string | null) ?? null,
      retryCount: Number(r.retryCount),
      approvedByName: (r.approvedByName as string | null) ?? null,
      rejectedByName: (r.rejectedByName as string | null) ?? null,
    };
  }
}