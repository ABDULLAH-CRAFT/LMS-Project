import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common'; // Nest decorators
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'; // Swagger decorators
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard'; // auth guard
import { RolesGuard } from 'src/common/roles.guard'; // role guard
import { Roles } from 'src/common/roles.decorator'; // role decorator
import { UserRole } from '../users/entities/user.entity'; // role enum
import { CourseContentService } from './course-content.service'; // service
import { CreateModuleDto } from './dto/create-module.dto'; // DTO
import { CreateLessonDto } from './dto/create-lesson.dto'; // DTO

@ApiTags('Course Content') // groups routes under "Course Content" in Swagger
@Controller('courses/:courseId') // nested under a specific course — every route here starts with /courses/:courseId
export class CourseContentController {
  constructor(private contentService: CourseContentService) {} // injects the service

  @Get('curriculum') // GET /courses/:courseId/curriculum
  @ApiOperation({ summary: 'Get the full module/lesson structure for a course (public)' }) // Swagger description
  getCurriculum(@Param('courseId') courseId: string) { // pulls :courseId from the URL
    return this.contentService.getCurriculum(courseId); // public — no guard, syllabus is visible to everyone
  }

  @Post('modules') // POST /courses/:courseId/modules
  @ApiBearerAuth() // needs a token
  @ApiOperation({ summary: 'Add a module to a course (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard) // must be logged in AND have the right role
  @Roles(UserRole.TEACHER) // only teachers
  createModule(@Req() req: any, @Param('courseId') courseId: string, @Body() dto: CreateModuleDto) {
    return this.contentService.createModule(req.user.userId, courseId, dto); // ownership checked inside the service
  }

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
}