import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { EngagementModule } from '../engagement/engagement.module';
import { MembershipTaxService } from './membership-tax.service';
import { MembershipPeriodService } from './membership-period.service';
import { MembershipPeriodsAdminController } from './membership-periods-admin.controller';

// Dependency direction: MembershipPeriods -> Finance, Engagement. Nothing imports this module, so there is no cycle.
@Module({
  imports: [FinanceModule, EngagementModule],
  controllers: [MembershipPeriodsAdminController],
  providers: [MembershipTaxService, MembershipPeriodService],
  exports: [MembershipPeriodService],
})
export class MembershipPeriodsModule {}