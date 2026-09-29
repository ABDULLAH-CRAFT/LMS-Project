import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RevenueAllocation } from './entities/revenue-allocation.entity';
import { RevenuePeriod } from './entities/revenue-period.entity';
import { RevenueRule } from './entities/revenue-rule.entity';
import { RevenueTransaction } from './entities/revenue-transaction.entity';
import { RevenueLedgerService } from './revenue-ledger.service';
import { RevenueRulesService } from './revenue-rules.service';
import { FinanceQueryService } from './finance-query.service';
import { FinanceController } from './finance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RevenueTransaction, RevenueAllocation, RevenuePeriod, RevenueRule])],
  controllers: [FinanceController], // R3
  providers: [RevenueRulesService, RevenueLedgerService, FinanceQueryService],
  exports: [RevenueRulesService, RevenueLedgerService, FinanceQueryService],
})
export class FinanceModule {}
