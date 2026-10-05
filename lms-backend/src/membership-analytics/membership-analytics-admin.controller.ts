import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MembershipAnalyticsService } from './membership-analytics.service';

@ApiTags('Admin Membership Analytics')
@ApiBearerAuth()
@Controller('admin/membership-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MembershipAnalyticsAdminController {
  constructor(private readonly analytics: MembershipAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Subscriber KPIs, MRR, churn, renewal rate and a 12-period trend (optional ?periodId=)' })
  overview(@Query('periodId') periodId?: string) {
    // The service validates the UUID and returns a 400 for anything else.
    return this.analytics.getOverview(periodId || undefined);
  }

  @Get('periods/:periodId')
  @ApiOperation({ summary: 'One period: revenue split, teacher pool breakdown and per-teacher engagement analytics (read-only)' })
  period(@Param('periodId', ParseUUIDPipe) periodId: string) {
    return this.analytics.getPeriodAnalytics(periodId);
  }
}