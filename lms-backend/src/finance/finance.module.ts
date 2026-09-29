import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RevenueAllocation } from './entities/revenue-allocation.entity';
import { RevenuePeriod } from './entities/revenue-period.entity';
import { RevenueRule } from './entities/revenue-rule.entity';
import { RevenueTransaction } from './entities/revenue-transaction.entity';
import { RevenueLedgerService } from './revenue-ledger.service';
import { RevenueRulesService } from './revenue-rules.service';

@Module({
  imports: [TypeOrmModule.forFeature([RevenueTransaction, RevenueAllocation, RevenuePeriod, RevenueRule])],
  providers: [RevenueRulesService, RevenueLedgerService],
  exports: [RevenueRulesService, RevenueLedgerService], // Phase R2 imports this module into the payment/enrollment flow
})
export class FinanceModule {}