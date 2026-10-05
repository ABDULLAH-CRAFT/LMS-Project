import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PayoutBalanceService } from './payout-balance.service';
import { PayoutsService } from './payouts.service';

// TEACHER only. The teacher id comes from the JWT and NOWHERE else: no id, amount or line is accepted from the client.
@ApiTags('Teacher Payouts')
@ApiBearerAuth()
@Controller('finance/teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class PayoutsTeacherController {
  constructor(
    private readonly payouts: PayoutsService,
    private readonly balances: PayoutBalanceService,
  ) {}

  @Get('balance')
  @ApiOperation({ summary: "The logged-in teacher's pending / available / processing / paid balances" })
  balance(@Req() req: any) {
    return this.balances.getTeacherBalance(req.user.userId);
  }

  @Get('payouts')
  @ApiOperation({ summary: "The logged-in teacher's payout history" })
  list(
    @Req() req: any,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    return this.payouts.listPayouts(
      { teacherId: req.user.userId, limit: Math.min(Math.max(limit, 1), 100), offset: Math.max(offset, 0) },
      false,
    );
  }

  @Post('payouts/request')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a payout of the whole available balance (amount is decided by the server)' })
  request(@Req() req: any) {
    return this.payouts.requestPayout(req.user.userId);
  }

  @Get('payouts/:id')
  @ApiOperation({ summary: "One of the logged-in teacher's payouts (404 if it belongs to someone else)" })
  detail(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.payouts.getDetail(id, { teacherId: req.user.userId });
  }
}