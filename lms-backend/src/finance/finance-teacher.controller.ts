import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { FinanceTeacherService } from './finance-teacher.service';
import { resolveTeacherRange } from './finance-teacher-range.util';

// TEACHER only, read-only. The teacher id comes from the JWT (req.user.userId) and NOWHERE else:
// there is no :teacherId in any URL, body or query, so a teacher cannot read another teacher's earnings.
// Filters: ?preset=all|today|7d|30d|this_month|last_month|custom  (custom also needs ?from=YYYY-MM-DD&to=YYYY-MM-DD)
@ApiTags('Teacher Finance')
@ApiBearerAuth()
@Controller('finance/teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class FinanceTeacherController {
  constructor(private readonly teacherFinance: FinanceTeacherService) {}

  @Get('overview')
  @ApiOperation({ summary: "The logged-in teacher's lifetime earnings summary and last 6 months" })
  overview(@Req() req: any) {
    return this.teacherFinance.getOverview(req.user.userId);
  }

  @Get('courses')
  @ApiOperation({ summary: "The logged-in teacher's earnings per course for a date range" })
  courses(
    @Req() req: any,
    @Query('preset') preset?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.teacherFinance.getCourseEarnings(req.user.userId, resolveTeacherRange(preset, from, to));
  }

  @Get('statement')
  @ApiOperation({ summary: "The logged-in teacher's earnings statement for a date range (paged)" })
  statement(
    @Req() req: any,
    @Query('preset') preset?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    return this.teacherFinance.getStatement(
      req.user.userId,
      resolveTeacherRange(preset, from, to),
      safeLimit,
      safeOffset,
    );
  }
}