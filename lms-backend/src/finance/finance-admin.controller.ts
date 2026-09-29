import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { FinanceAdminService } from './finance-admin.service';
import { resolveRange } from './finance-range.util';

// Admin-only. Every route below is read-only: it never writes to the ledger.
// Filters: ?preset=today|7d|30d|this_month|last_month|custom  (custom also needs ?from=YYYY-MM-DD&to=YYYY-MM-DD)
@ApiTags('Admin Finance')
@ApiBearerAuth()
@Controller('admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class FinanceAdminController {
  constructor(private readonly adminFinance: FinanceAdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Course revenue KPIs for a date range (admin only)' })
  overview(@Query('preset') preset?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.adminFinance.getOverview(resolveRange(preset, from, to));
  }

  @Get('teachers')
  @ApiOperation({ summary: 'Teacher revenue table for a date range (admin only)' })
  teachers(@Query('preset') preset?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.adminFinance.getTeacherRevenue(resolveRange(preset, from, to));
  }

  @Get('courses')
  @ApiOperation({ summary: 'Course revenue table for a date range (admin only)' })
  courses(@Query('preset') preset?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.adminFinance.getCourseRevenue(resolveRange(preset, from, to));
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Paged list of course payments in a date range (admin only)' })
  transactions(
    @Query('preset') preset?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    return this.adminFinance.listTransactions(resolveRange(preset, from, to), safeLimit, safeOffset, search);
  }

  @Get('transactions/:paymentId')
  @ApiOperation({ summary: 'Payment -> items -> course -> teacher -> allocations -> refunds -> final net (admin only)' })
  transactionDetail(@Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.adminFinance.getTransactionDetail(paymentId);
  }
}