import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { FinanceQueryService } from './finance-query.service';

@ApiTags('Finance')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private queries: FinanceQueryService) {}

  @Get('admin/finance/payments/:paymentId/revenue')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Original purchase -> refunds -> reversals -> final net for one payment (admin only)' })
  paymentRevenue(@Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.queries.getPaymentRevenue(paymentId);
  }

  // The teacher id comes from the JWT only. There is no :teacherId in the URL, so one
  // teacher cannot request another teacher's records by changing an id.
  @Get('finance/teacher/ledger')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: "The logged-in teacher's own earnings and refund adjustments" })
  teacherLedger(
    @Req() req: any,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safeOffset = Math.max(offset, 0);
    return this.queries.getTeacherLedger(req.user.userId, safeLimit, safeOffset);
  }
}
