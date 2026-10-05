import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { MembershipAnalyticsService } from './membership-analytics.service';
import { MembershipAnalyticsAdminController } from './membership-analytics-admin.controller';

// Read-only module. Dependency direction: MembershipAnalytics -> Memberships. Nothing imports this module, so there is no cycle.
@Module({
  imports: [MembershipsModule],
  controllers: [MembershipAnalyticsAdminController],
  providers: [MembershipAnalyticsService],
})
export class MembershipAnalyticsModule {}