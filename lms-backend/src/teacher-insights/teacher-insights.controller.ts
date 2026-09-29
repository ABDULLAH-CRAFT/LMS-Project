import { Controller, Get, Param, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TeacherInsightsService } from './teacher-insights.service';

@ApiTags('Teacher Insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
@Controller()
export class TeacherInsightsController {
  constructor(private insightsService: TeacherInsightsService) {}

  @Get('courses/:courseId/students') // GET /courses/:courseId/students
  @ApiOperation({ summary: 'Enrolled students of a course with lesson progress (owning teacher only)' })
  getCourseStudents(@Req() req: any, @Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.insightsService.getCourseStudents(req.user.userId, courseId);
  }

  @Get('teacher/earnings') // GET /teacher/earnings
  @ApiOperation({ summary: "Sales and revenue for the logged-in teacher's courses" })
  getEarnings(@Req() req: any) {
    return this.insightsService.getEarnings(req.user.userId);
  }
}