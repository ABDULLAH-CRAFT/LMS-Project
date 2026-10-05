import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MembershipRevenueService } from './membership-revenue.service';

@ApiTags('Admin Memberships')
@ApiBearerAuth()
@Controller('admin/memberships/revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminMembershipRevenueController {
  constructor(private readonly revenue: MembershipRevenueService) {}

  @Get()
  @ApiOperation({ summary: 'Membership money pooled per revenue period (read-only)' })
  periods() {
    return this.revenue.listPeriods();
  }

  @Get(':periodId/payments')
  @ApiOperation({ summary: 'Membership payments inside one revenue period' })
  payments(
    @Param('periodId', ParseUUIDPipe) periodId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    return this.revenue.paymentsInPeriod(periodId, Math.min(Math.max(limit, 1), 200), Math.max(offset, 0));
  }
}