import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { fromPaise, toPaise } from '../finance/money.util';
import { BALANCE_AGG, LINES_CTE } from './payout.sql';
import { EffectivePayoutSettings, PayoutSettingsService } from './payout-settings.service';

type Runner = EntityManager | DataSource;
type Row = Record<string, any>;

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PayoutBalanceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly settings: PayoutSettingsService,
  ) {}

  async getTeacherBalance(teacherId: string, runner: Runner = this.dataSource) {
    const settings = await this.settings.getEffective(runner);
    const rows: Row[] = await runner.query(`${LINES_CTE} SELECT ${BALANCE_AGG} FROM state s`, [teacherId, settings.holdDays]);
    const open: Row[] = await runner.query(
      `SELECT COUNT(*)::int AS "n" FROM "payouts" WHERE "teacherId" = $1::uuid AND "status"::text = 'PENDING'`,
      [teacherId],
    );
    return this.shape(rows[0], settings, Number(open[0].n) > 0);
  }

  /** Every teacher that has at least one payable line, for the admin balances table. */
  async listBalances() {
    const settings = await this.settings.getEffective();
    const rows: Row[] = await this.dataSource.query(
      `${LINES_CTE}
       SELECT s."teacherId", u."name" AS "teacherName", u."email" AS "teacherEmail", ${BALANCE_AGG},
              (SELECT COUNT(*)::int FROM "payouts" y WHERE y."teacherId" = s."teacherId" AND y."status"::text = 'PENDING') AS "openRequests"
         FROM state s
         JOIN "users" u ON u."id" = s."teacherId"
        GROUP BY s."teacherId", u."name", u."email"`,
      [null, settings.holdDays],
    );

    const teachers = rows.map((r) => {
      const shaped = this.shape(r, settings, Number(r.openRequests) > 0);
      return {
        teacherId: r.teacherId as string,
        teacherName: r.teacherName as string,
        teacherEmail: r.teacherEmail as string,
        balances: shaped.balances,
        openRequests: Number(r.openRequests),
        canRequest: shaped.canRequest,
      };
    });
    teachers.sort((a, b) => {
      const diff = toPaise(b.balances.availableBalance) - toPaise(a.balances.availableBalance);
      return diff === 0n ? a.teacherName.localeCompare(b.teacherName) : diff > 0n ? 1 : -1;
    });

    return { settings: { holdDays: settings.holdDays, minimumPayout: settings.minimumPayout }, teachers };
  }

  private shape(r: Row, settings: EffectivePayoutSettings, hasOpenRequest: boolean) {
    const pending = toPaise(r.pending);
    const available = toPaise(r.available);
    const processing = toPaise(r.processing);
    const paid = toPaise(r.paid);
    const minimum = toPaise(settings.minimumPayout);

    let cannotRequestReason: string | null = null;
    if (hasOpenRequest) cannotRequestReason = 'You already have a payout request waiting for approval.';
    else if (available <= 0n) cannotRequestReason = 'You have no available balance yet.';
    else if (available < minimum) cannotRequestReason = `The minimum payout is ${settings.minimumPayout}.`;

    return {
      currency: 'INR',
      settings: { holdDays: settings.holdDays, minimumPayout: settings.minimumPayout },
      balances: {
        pendingEarnings: fromPaise(pending),
        availableBalance: fromPaise(available),
        processingBalance: fromPaise(processing),
        paidBalance: fromPaise(paid),
        adjustmentBalance: fromPaise(toPaise(r.adjustments)), // informational: already included in the buckets
        lifetimeNet: fromPaise(pending + available + processing + paid),
      },
      nextReleaseAt: r.oldestHeldAt ? new Date(new Date(r.oldestHeldAt).getTime() + settings.holdDays * DAY_MS) : null,
      canRequest: cannotRequestReason === null,
      cannotRequestReason,
      hasOpenRequest,
    };
  }
}