import { Controller, DefaultValuePipe, Get, ParseIntPipe, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { EngagementQueryService } from './engagement-query.service';

@ApiTags('Admin Engagement')
@ApiBearerAuth()
@Controller('admin/engagement')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class EngagementAdminController {
  constructor(private readonly query: EngagementQueryService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Engagement events and points per type and per teacher (read-only). Defaults to the last 30 days.' })
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.query.summary(from, to);
  }

  @Get('events')
  @ApiOperation({ summary: 'Raw engagement events, newest first (read-only)' })
  events(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('teacherId', new ParseUUIDPipe({ optional: true })) teacherId?: string,
    @Query('studentId', new ParseUUIDPipe({ optional: true })) studentId?: string,
    @Query('courseId', new ParseUUIDPipe({ optional: true })) courseId?: string,
    @Query('eventType') eventType?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    return this.query.events({
      from,
      to,
      teacherId,
      studentId,
      courseId,
      eventType,
      limit: Math.min(Math.max(limit, 1), 200),
      offset: Math.max(offset, 0),
    });
  }
}