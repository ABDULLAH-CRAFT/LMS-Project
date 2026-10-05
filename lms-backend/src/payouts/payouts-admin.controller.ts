import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PayoutBalanceService } from './payout-balance.service';
import { PayoutSettingsService } from './payout-settings.service';
import { PayoutsService } from './payouts.service';

export class ReasonDto {
  @IsString() @MinLength(3) @MaxLength(500)
  reason!: string;
}

export class MarkPaidDto {
  @IsString() @MinLength(3) @MaxLength(100)
  providerPayoutId!: string; // bank / UTR reference of the transfer

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

export class UpdatePayoutSettingsDto {
  @IsInt() @Min(0) @Max(90)
  holdDays!: number;

  @IsString() @Matches(/^\d{1,10}(\.\d{1,2})?$/, { message: 'minimumPayout must be an amount such as 100 or 100.00' })
  minimumPayout!: string;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

@ApiTags('Admin Payouts')
@ApiBearerAuth()
@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PayoutsAdminController {
  constructor(
    private readonly payouts: PayoutsService,
    private readonly balances: PayoutBalanceService,
    private readonly settings: PayoutSettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Payouts (filter by ?status= and ?teacherId=) with totals per status' })
  list(
    @Query('status') status?: string,
    @Query('teacherId') teacherId?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    return this.payouts.listPayouts(
      { status: status || undefined, teacherId: teacherId || undefined, limit: Math.min(Math.max(limit, 1), 100), offset: Math.max(offset, 0) },
      true,
    );
  }

  // Static routes MUST stay above ':id'.
  @Get('balances')
  @ApiOperation({ summary: 'Every teacher balance (pending / available / processing / paid)' })
  teacherBalances() {
    return this.balances.listBalances();
  }

  @Get('settings')
  @ApiOperation({ summary: 'Payout hold days and minimum payout (current and history)' })
  getSettings() {
    return this.settings.list();
  }

  @Post('settings')
  @ApiOperation({ summary: 'Append new payout settings, effective immediately' })
  updateSettings(@Req() req: any, @Body() dto: UpdatePayoutSettingsDto) {
    return this.settings.create(dto, req.user.userId);
  }

  @Get('teachers/:teacherId/statement')
  @ApiOperation({ summary: "A teacher's balance and full payout history" })
  statement(@Param('teacherId', ParseUUIDPipe) teacherId: string) {
    return this.payouts.teacherStatement(teacherId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One payout with the exact ledger lines it settles and its status history' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.payouts.getDetail(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'PENDING -> APPROVED' })
  approve(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.payouts.approve(id, req.user.userId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a request, or cancel a FAILED payout (the lines become available again)' })
  reject(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto) {
    return this.payouts.reject(id, req.user.userId, dto.reason);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'APPROVED -> PROCESSING (the bank transfer has been started)' })
  process(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.payouts.startProcessing(id, req.user.userId);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'FAILED -> PROCESSING' })
  retry(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.payouts.retry(id, req.user.userId);
  }

  @Post(':id/mark-paid')
  @ApiOperation({ summary: 'PROCESSING -> PAID, with the bank reference' })
  markPaid(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: MarkPaidDto) {
    return this.payouts.markPaid(id, req.user.userId, dto.providerPayoutId.trim(), dto.note);
  }

  @Post(':id/mark-failed')
  @ApiOperation({ summary: 'PROCESSING -> FAILED, with a reason' })
  markFailed(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto) {
    return this.payouts.markFailed(id, req.user.userId, dto.reason);
  }

  @Post(':id/reverse')
  @ApiOperation({ summary: 'PAID -> REVERSED (bank returned the money); lines become available again' })
  reverse(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto) {
    return this.payouts.reverse(id, req.user.userId, dto.reason);
  }
}