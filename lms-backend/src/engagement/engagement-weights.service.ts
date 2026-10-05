import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { percentToBps } from '../finance/money.util';
import { assertValidWeights, WeightsBps } from './engagement-score.calculator';

export interface WeightConfigRow extends WeightsBps {
  id: string;
  effectiveFrom: Date;
  createdById: string | null;
  note: string | null;
  createdAt: Date;
}

export interface CreateWeightsInput {
  effectiveMonth: string; // "2026-11"
  lessonCompletion: string;
  courseCompletion: string;
  assessment: string;
  returningLearner: string;
  rating: string;
  note?: string;
}

const IST = '+05:30';

@Injectable()
export class EngagementWeightsService {
  constructor(private readonly dataSource: DataSource) {}

  /** Weights in force at `at` (latest effectiveFrom <= at). Fails loudly - no hard-coded fallback. */
  async getEffective(at: Date, manager?: EntityManager): Promise<WeightConfigRow> {
    const runner = manager ?? this.dataSource.manager;
    const rows: WeightConfigRow[] = await runner.query(
      `SELECT * FROM "engagement_weight_configs" WHERE "effectiveFrom" <= $1 ORDER BY "effectiveFrom" DESC LIMIT 1`,
      [at],
    );
    if (!rows[0]) throw new InternalServerErrorException(`No engagement weights configured at ${at.toISOString()}`);
    return rows[0];
  }

  list(): Promise<WeightConfigRow[]> {
    return this.dataSource.query(
      `SELECT w.*, u."name" AS "createdByName"
         FROM "engagement_weight_configs" w
         LEFT JOIN "users" u ON u."id" = w."createdById"
        ORDER BY w."effectiveFrom" DESC`,
    );
  }

  /** Schedules new weights from the 1st of a FUTURE month (IST). Past configs are never edited. */
  async create(input: CreateWeightsInput, adminId: string): Promise<WeightConfigRow> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.effectiveMonth)) {
      throw new BadRequestException('effectiveMonth must look like 2026-11');
    }
    const effectiveFrom = new Date(`${input.effectiveMonth}-01T00:00:00${IST}`);
    if (effectiveFrom.getTime() <= Date.now()) {
      throw new BadRequestException('New weights must start from the first day of a future month, so past calculations stay reproducible');
    }

    let weights: WeightsBps;
    try {
      weights = {
        lessonCompletionBps: Number(percentToBps(input.lessonCompletion)),
        courseCompletionBps: Number(percentToBps(input.courseCompletion)),
        assessmentBps: Number(percentToBps(input.assessment)),
        returningLearnerBps: Number(percentToBps(input.returningLearner)),
        ratingBps: Number(percentToBps(input.rating)),
      };
      assertValidWeights(weights);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const existing = await this.dataSource.query(`SELECT 1 FROM "engagement_weight_configs" WHERE "effectiveFrom" = $1`, [effectiveFrom]);
    if (existing.length > 0) throw new ConflictException('Weights are already scheduled for that month');

    const rows: WeightConfigRow[] = await this.dataSource.query(
      `INSERT INTO "engagement_weight_configs"
         ("lessonCompletionBps","courseCompletionBps","assessmentBps","returningLearnerBps","ratingBps","effectiveFrom","createdById","note")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        weights.lessonCompletionBps,
        weights.courseCompletionBps,
        weights.assessmentBps,
        weights.returningLearnerBps,
        weights.ratingBps,
        effectiveFrom,
        adminId,
        input.note?.trim() || null,
      ],
    );
    return rows[0];
  }
}