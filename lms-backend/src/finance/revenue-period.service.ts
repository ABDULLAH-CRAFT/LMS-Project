import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { RevenuePeriod } from './entities/revenue-period.entity';
import { RevenuePeriodStatus } from './finance.enums';

// Revenue periods are calendar months in IST (the business operates in India).
const IST_OFFSET_MS = 330 * 60 * 1000;
const MAX_ROLL_FORWARD_MONTHS = 24;

/** Date.UTC normalises overflowing months/days, so (2026, 12, 1) is 2027-01-01. */
function ymd(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

@Injectable()
export class RevenuePeriodService {
  /**
   * Returns the OPEN monthly period that a payment made at `occurredAt` belongs to,
   * creating it on first use. Safe under concurrency (INSERT ... ON CONFLICT DO NOTHING).
   *
   * If that month's period is no longer OPEN (calculation already started or finalised) the
   * payment rolls into the NEXT open month instead of disturbing a frozen/in-progress period.
   * The ledger row keeps its true occurredAt, so the roll-forward stays visible.
   */
  async resolveOpenPeriod(occurredAt: Date, manager: EntityManager): Promise<RevenuePeriod> {
    const shifted = new Date(occurredAt.getTime() + IST_OFFSET_MS);
    const year = shifted.getUTCFullYear();
    let month = shifted.getUTCMonth();

    for (let i = 0; i < MAX_ROLL_FORWARD_MONTHS; i++, month++) {
      const periodStart = ymd(year, month, 1);
      const periodEnd = ymd(year, month + 1, 0); // day 0 of next month = last day of this month

      await manager.createQueryBuilder().insert().into(RevenuePeriod).values({ periodStart, periodEnd }).orIgnore().execute();

      const period = await manager.findOneByOrFail(RevenuePeriod, { periodStart, periodEnd });
      if (period.status === RevenuePeriodStatus.OPEN) return period;
    }

    throw new InternalServerErrorException('No OPEN revenue period is available for this membership payment');
  }
}