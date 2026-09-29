import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@ApiTags('Announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Post('courses/:courseId/announcements') // POST /courses/:courseId/announcements
  @ApiOperation({ summary: 'Post an announcement to a published course (owning teacher only)' })
  @Roles(UserRole.TEACHER)
  create(
    @Req() req: any,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.create(req.user.userId, courseId, dto);
  }

  @Get('courses/:courseId/announcements') // GET /courses/:courseId/announcements
  @ApiOperation({ summary: 'List a course\'s announcements (owning teacher or enrolled student)' })
  @Roles(UserRole.TEACHER, UserRole.STUDENT)
  list(@Req() req: any, @Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.announcementsService.listForCourse(req.user, courseId);
  }

  @Delete('courses/:courseId/announcements/:id') // DELETE /courses/:courseId/announcements/:id
  @ApiOperation({ summary: 'Delete an announcement (owning teacher only)' })
  @Roles(UserRole.TEACHER)
  remove(
    @Req() req: any,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.announcementsService.remove(req.user.userId, courseId, id);
  }

  @Get('student/announcements') // GET /student/announcements
  @ApiOperation({ summary: 'Announcements from all courses the student is enrolled in' })
  @Roles(UserRole.STUDENT)
  listMine(@Req() req: any) {
    return this.announcementsService.listForStudent(req.user.userId);
  }
}