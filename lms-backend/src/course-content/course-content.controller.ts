import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'; // Nest decorators
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'; // Swagger decorators
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard'; // auth guard
import { RolesGuard } from 'src/common/roles.guard'; // role guard
import { Roles } from 'src/common/roles.decorator'; // role decorator
import { UserRole } from '../users/entities/user.entity'; // role enum
import { CourseContentService } from './course-content.service'; // service
import { CreateModuleDto } from './dto/create-module.dto'; // DTO
import { CreateLessonDto } from './dto/create-lesson.dto'; // DTO
import { UpdateModuleDto } from './dto/update-module.dto'; // NEW
import { UpdateLessonDto } from './dto/update-lesson.dto'; // NEW
import { ReorderDto } from './dto/reorder.dto'; // NEW

@ApiTags('Course Content') // groups routes under "Course Content" in Swagger
@Controller('courses/:courseId') // nested under a specific course — every route here starts with /courses/:courseId
export class CourseContentController {
  constructor(private contentService: CourseContentService) {} // injects the service

  @Get('curriculum') // GET /courses/:courseId/curriculum
  @ApiOperation({ summary: 'Get the full module/lesson structure for a course (public)' })
  getCurriculum(@Param('courseId') courseId: string) {
    return this.contentService.getCurriculum(courseId); // public — no guard, syllabus is visible to everyone
  }

  // ───────────── modules ─────────────

  @Post('modules') // POST /courses/:courseId/modules
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a module to a course (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  createModule(@Req() req: any, @Param('courseId') courseId: string, @Body() dto: CreateModuleDto) {
    return this.contentService.createModule(req.user.userId, courseId, dto);
  }

  // Deliberately NOT "modules/reorder" — that would collide with "modules/:moduleId" below.
  @Patch('reorder-modules') // PATCH /courses/:courseId/reorder-modules
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder all modules of a course (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  reorderModules(@Req() req: any, @Param('courseId') courseId: string, @Body() dto: ReorderDto) {
    return this.contentService.reorderModules(req.user.userId, courseId, dto);
  }

  @Patch('modules/:moduleId') // PATCH /courses/:courseId/modules/:moduleId
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rename a module (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  updateModule(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.contentService.updateModule(req.user.userId, courseId, moduleId, dto);
  }

  @Delete('modules/:moduleId') // DELETE /courses/:courseId/modules/:moduleId
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a module with all its lessons, notes and assignments (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  deleteModule(@Req() req: any, @Param('courseId') courseId: string, @Param('moduleId') moduleId: string) {
    return this.contentService.deleteModule(req.user.userId, courseId, moduleId);
  }

  // ───────────── lessons ─────────────

  @Post('modules/:moduleId/lessons') // POST /courses/:courseId/modules/:moduleId/lessons
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a lesson to a module (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  createLesson(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.contentService.createLesson(req.user.userId, courseId, moduleId, dto);
  }

  @Patch('modules/:moduleId/reorder-lessons') // PATCH /courses/:courseId/modules/:moduleId/reorder-lessons
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder all lessons inside a module (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  reorderLessons(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.contentService.reorderLessons(req.user.userId, courseId, moduleId, dto);
  }

  @Patch('lessons/:lessonId') // PATCH /courses/:courseId/lessons/:lessonId
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit a lesson: title, type, content (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  updateLesson(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.contentService.updateLesson(req.user.userId, courseId, lessonId, dto);
  }

  @Delete('lessons/:lessonId') // DELETE /courses/:courseId/lessons/:lessonId
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a lesson with its notes and assignments (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  deleteLesson(@Req() req: any, @Param('courseId') courseId: string, @Param('lessonId') lessonId: string) {
    return this.contentService.deleteLesson(req.user.userId, courseId, lessonId);
  }
}