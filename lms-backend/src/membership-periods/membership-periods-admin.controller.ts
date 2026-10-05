import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MembershipPeriodService } from './membership-period.service';
import { MembershipTaxService } from './membership-tax.service';

export class CalculatePeriodDto {
  @IsOptional() @IsBoolean()
  refreshEngagement?: boolean;
}

export class FinalizePeriodDto {
  @IsUUID()
  calculationId!: string;

  @IsOptional() @IsBoolean()
  acknowledgeUndistributedPool?: boolean;
}

export class CreateMembershipTaxConfigDto {
  @IsString() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'effectiveMonth must look like 2026-11' })
  effectiveMonth!: string;

  @IsString() @Matches(/^\d{1,3}(\.\d{1,2})?$/, { message: 'taxRate must be a percentage such as 18 or 18.00' })
  taxRate!: string;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

@ApiTags('Admin Membership Periods')
@ApiBearerAuth()
@Controller('admin/membership-periods')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MembershipPeriodsAdminController {
  constructor(
    private readonly periods: MembershipPeriodService,
    private readonly tax: MembershipTaxService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Revenue periods with live membership totals and their latest frozen calculation' })
  list() {
    return this.periods.listPeriods();
  }

  // Static routes MUST stay above ':periodId' so "tax-configs" is not parsed as a UUID.
  @Get('tax-configs')
  @ApiOperation({ summary: 'Membership tax settings (effective-dated, newest first)' })
  listTax() {
    return this.tax.list();
  }

  @Post('tax-configs')
  @ApiOperation({ summary: 'Schedule a new membership tax setting from the 1st of a future month' })
  createTax(@Req() req: any, @Body() dto: CreateMembershipTaxConfigDto) {
    return this.tax.create(dto, req.user.userId);
  }

  @Get(':periodId')
  @ApiOperation({ summary: 'One period: live figures, latest frozen calculation, teacher allocations, finalize readiness' })
  detail(@Param('periodId', ParseUUIDPipe) periodId: string) {
    return this.periods.getDetail(periodId);
  }

  @Post(':periodId/calculate')
  @ApiOperation({ summary: 'Calculate and freeze a new membership revenue run (refused once the period is finalized)' })
  calculate(@Req() req: any, @Param('periodId', ParseUUIDPipe) periodId: string, @Body() dto: CalculatePeriodDto) {
    return this.periods.calculate(periodId, req.user.userId, dto?.refreshEngagement === true);
  }

  @Post(':periodId/finalize')
  @ApiOperation({ summary: 'Finalize a period using the exact calculation the admin reviewed' })
  finalize(@Req() req: any, @Param('periodId', ParseUUIDPipe) periodId: string, @Body() dto: FinalizePeriodDto) {
    return this.periods.finalize(periodId, dto.calculationId, req.user.userId, dto.acknowledgeUndistributedPool === true);
  }
}