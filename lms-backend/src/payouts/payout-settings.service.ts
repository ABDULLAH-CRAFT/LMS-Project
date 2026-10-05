import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { toPaise } from '../finance/money.util';

type Runner = EntityManager | DataSource;

export interface EffectivePayoutSettings {
  id: string;
  holdDays: number;
  minimumPayout: string;
  effectiveFrom: Date;
}

@Injectable()
export class PayoutSettingsService {
  constructor(private readonly dataSource: DataSource) {}

  async getEffective(runner: Runner = this.dataSource, at: Date = new Date()): Promise<EffectivePayoutSettings> {
    const rows: any[] = await runner.query(
      `SELECT "id", "holdDays", "minimumPayout"::text AS "minimumPayout", "effectiveFrom"
         FROM "payout_settings" WHERE "effectiveFrom" <= $1 ORDER BY "effectiveFrom" DESC LIMIT 1`,
      [at],
    );
    if (!rows[0]) throw new InternalServerErrorException('Payout settings are not configured');
    return { id: rows[0].id, holdDays: Number(rows[0].holdDays), minimumPayout: rows[0].minimumPayout, effectiveFrom: rows[0].effectiveFrom };
  }

  async list() {
    const rows: any[] = await this.dataSource.query(
      `SELECT s."id", s."holdDays", s."minimumPayout"::text AS "minimumPayout", s."effectiveFrom", s."note", s."createdAt", u."name" AS "createdByName"
         FROM "payout_settings" s LEFT JOIN "users" u ON u."id" = s."createdById"
        ORDER BY s."effectiveFrom" DESC LIMIT 20`,
    );
    const current = await this.getEffective();
    return { current: { holdDays: current.holdDays, minimumPayout: current.minimumPayout, effectiveFrom: current.effectiveFrom }, history: rows };
  }

  /** Appends a new setting that applies from now on (settings rows are never edited). */
  async create(input: { holdDays: number; minimumPayout: string; note?: string }, adminId: string) {
    toPaise(input.minimumPayout); // throws on anything that is not a valid money amount
    try {
      await this.dataSource.query(
        `INSERT INTO "payout_settings" ("holdDays","minimumPayout","effectiveFrom","createdById","note") VALUES ($1,$2,now(),$3,$4)`,
        [input.holdDays, input.minimumPayout, adminId, input.note ?? null],
      );
    } catch (err: any) {
      if ((err?.code ?? err?.driverError?.code) === '23505') throw new ConflictException('Settings were just changed. Please try again.');
      throw err;
    }
    return this.list();
  }
}