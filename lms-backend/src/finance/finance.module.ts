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
import { FinanceAdminService } from './finance-admin.service'; // R4
import { FinanceAdminController } from './finance-admin.controller'; // R4
import { FinanceTeacherService } from './finance-teacher.service'; // R5
import { FinanceTeacherController } from './finance-teacher.controller'; // R5

@Module({
  imports: [TypeOrmModule.forFeature([RevenueTransaction, RevenueAllocation, RevenuePeriod, RevenueRule])],
  controllers: [FinanceController, FinanceAdminController, FinanceTeacherController], // R3, R4, R5
  providers: [RevenueRulesService, RevenueLedgerService, FinanceQueryService, FinanceAdminService, FinanceTeacherService],
  exports: [RevenueRulesService, RevenueLedgerService, FinanceQueryService, FinanceAdminService, FinanceTeacherService],
})
export class FinanceModule {}