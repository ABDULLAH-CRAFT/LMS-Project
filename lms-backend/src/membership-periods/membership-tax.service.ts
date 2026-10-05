import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { percentToBps } from '../finance/money.util';

export interface TaxConfigRow {
  id: string;
  taxRateBps: number;
  effectiveFrom: Date;
  createdById: string | null;
  note: string | null;
  createdAt: Date;
}

export interface CreateTaxConfigInput {
  effectiveMonth: string; // "2026-11"
  taxRate: string; // percentage already included in the price, e.g. "18" or "18.00"
  note?: string;
}

const IST = '+05:30';

@Injectable()
export class MembershipTaxService {
  constructor(private readonly dataSource: DataSource) {}

  /** Tax setting in force at `at`. Fails loudly - no hard-coded fallback. */
  async getEffective(at: Date, manager?: EntityManager): Promise<TaxConfigRow> {
    const runner = manager ?? this.dataSource.manager;
    const rows: TaxConfigRow[] = await runner.query(
      `SELECT * FROM "membership_tax_configs" WHERE "effectiveFrom" <= $1 ORDER BY "effectiveFrom" DESC LIMIT 1`,
      [at],
    );
    if (!rows[0]) throw new InternalServerErrorException(`No membership tax configuration at ${at.toISOString()}`);
    return rows[0];
  }

  list() {
    return this.dataSource.query(
      `SELECT t."id", t."taxRateBps", t."effectiveFrom", t."note", t."createdAt", u."name" AS "createdByName"
         FROM "membership_tax_configs" t LEFT JOIN "users" u ON u."id" = t."createdById"
        ORDER BY t."effectiveFrom" DESC`,
    );
  }

  /** Schedules a new tax setting from the 1st of a FUTURE month (IST). Past settings are never edited. */
  async create(input: CreateTaxConfigInput, adminId: string): Promise<TaxConfigRow> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.effectiveMonth)) {
      throw new BadRequestException('effectiveMonth must look like 2026-11');
    }
    const effectiveFrom = new Date(`${input.effectiveMonth}-01T00:00:00${IST}`);
    if (effectiveFrom.getTime() <= Date.now()) {
      throw new BadRequestException('A new tax setting must start from the first day of a future month, so past calculations stay reproducible');
    }

    let taxRateBps: number;
    try {
      taxRateBps = Number(percentToBps(input.taxRate));
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const existing = await this.dataSource.query(`SELECT 1 FROM "membership_tax_configs" WHERE "effectiveFrom" = $1`, [effectiveFrom]);
    if (existing.length > 0) throw new ConflictException('A tax setting is already scheduled for that month');

    const rows: TaxConfigRow[] = await this.dataSource.query(
      `INSERT INTO "membership_tax_configs" ("taxRateBps","effectiveFrom","createdById","note") VALUES ($1,$2,$3,$4) RETURNING *`,
      [taxRateBps, effectiveFrom, adminId, input.note?.trim() || null],
    );
    return rows[0];
  }
}