import { Controller, Post, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ProgressService } from './progress.service';

@ApiTags('Progress')
@Controller('progress')
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Post('lessons/:lessonId/complete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a lesson as completed for the logged-in student' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  completeLesson(@Req() req: any, @Param('lessonId') lessonId: string) {
    return this.progressService.completeLesson(req.user.userId, lessonId);
  }

  @Get('courses/:courseId')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the logged-in student's progress for one course" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  getCourseProgress(@Req() req: any, @Param('courseId') courseId: string) {
    return this.progressService.getCourseProgress(req.user.userId, courseId);
  }

  @Get('me/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the logged-in student's learning stats" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  getMyStats(@Req() req: any) {
    return this.progressService.getMyStats(req.user.userId);
  }
}