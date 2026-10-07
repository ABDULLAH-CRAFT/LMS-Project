import { BadRequestException, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AUDIT_CATEGORIES, AuditCategory, ReconciliationService } from './reconciliation.service';
import { ReconciliationTraceService } from './reconciliation-trace.service';

const clampLimit = (n: number) => Math.min(Math.max(n, 1), 100);
const clampOffset = (n: number) => Math.max(n, 0);

// Admin-only. Read-only against the ledger: nothing here can change a financial record.
@ApiTags('Admin Reconciliation')
@ApiBearerAuth()
@Controller('admin/reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ReconciliationAdminController {
  constructor(
    private readonly reconciliation: ReconciliationService,
    private readonly trace: ReconciliationTraceService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Run every reconciliation check now (live, not saved)' })
  overview() {
    return this.reconciliation.overview();
  }

  @Post('run')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Run every check and save an immutable snapshot of the result' })
  run(@Req() req: any) {
    return this.reconciliation.run(req.user.userId);
  }

  @Get('runs')
  @ApiOperation({ summary: 'Saved reconciliation snapshots (latest 30)' })
  runs() {
    return this.reconciliation.listRuns();
  }

  @Get('runs/:runId')
  @ApiOperation({ summary: 'One saved snapshot with its full check results' })
  runDetail(@Param('runId', ParseUUIDPipe) runId: string) {
    return this.reconciliation.getRun(runId);
  }

  @Get('audit-trail')
  @ApiOperation({ summary: 'Who did what in the financial system (payouts, periods, refunds, configuration)' })
  auditTrail(
    @Query('category') category?: string,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit = 25,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    if (category && !AUDIT_CATEGORIES.includes(category as AuditCategory)) {
      throw new BadRequestException(`category must be one of ${AUDIT_CATEGORIES.join(', ')}`);
    }
    return this.reconciliation.auditTrail({
      category: (category as AuditCategory) || undefined,
      limit: clampLimit(limit),
      offset: clampOffset(offset),
    });
  }

  // Static routes above stay above the ':id' style routes.
  @Get('teachers')
  @ApiOperation({ summary: 'All teachers (for the trace picker)' })
  teachers() {
    return this.trace.listTeachers();
  }

  @Get('teachers/:teacherId/explain')
  @ApiOperation({ summary: 'Why this teacher earned what they earned (course + membership + balance + payouts)' })
  explain(@Param('teacherId', ParseUUIDPipe) teacherId: string) {
    return this.trace.explainTeacher(teacherId);
  }

  @Get('teachers/:teacherId/course-lines')
  @ApiOperation({ summary: "A teacher's course-revenue ledger lines (sales and refund reversals)" })
  courseLines(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    return this.trace.courseLines(teacherId, clampLimit(limit), clampOffset(offset));
  }

  @Get('teachers/:teacherId/periods/:periodId/engagement')
  @ApiOperation({ summary: 'Engagement score breakdown behind one membership payout' })
  engagement(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Param('periodId', ParseUUIDPipe) periodId: string,
  ) {
    return this.trace.engagementBreakdown(teacherId, periodId);
  }

  @Get('payments/:paymentId/trace')
  @ApiOperation({ summary: 'Payment -> items -> ledger -> allocations -> refunds -> subscription -> payout status' })
  paymentTrace(@Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.trace.paymentTrace(paymentId);
  }
}