import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { RevenueRule } from './entities/revenue-rule.entity';
import { RevenueSourceType } from './finance.enums';

@Injectable()
export class RevenueRulesService {
  constructor(@InjectRepository(RevenueRule) private ruleRepo: Repository<RevenueRule>) {}

  /** The rule in force at `at` (latest effectiveFrom <= at). Pass `manager` inside a transaction. */
  async getEffectiveRule(sourceType: RevenueSourceType, at: Date, manager?: EntityManager): Promise<RevenueRule> {
    const repo = manager ? manager.getRepository(RevenueRule) : this.ruleRepo;

    const rule = await repo
      .createQueryBuilder('r')
      .where('r.sourceType = :sourceType', { sourceType })
      .andWhere('r.effectiveFrom <= :at', { at })
      .orderBy('r.effectiveFrom', 'DESC')
      .limit(1)
      .getOne();

    if (!rule) {
      // Fail loudly - never fall back to a hard-coded percentage.
      throw new InternalServerErrorException(`No revenue rule configured for ${sourceType} at ${at.toISOString()}`);
    }
    return rule;
  }
}