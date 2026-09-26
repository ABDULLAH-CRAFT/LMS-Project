import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto'; // NEW

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Get() // GET /courses — public catalog, checked first, no wildcard risk
  @ApiOperation({ summary: 'Get all published courses (public), optionally filtered by ?search=' })
  findPublished(@Query('search') search?: string) {
    return this.coursesService.findPublished(search);
  }

  @Get('mine') // MOVED — must come before ':id', since 'mine' would otherwise get swallowed by the wildcard route below
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the logged-in teacher's own courses" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  findMine(@Req() req: any) {
    return this.coursesService.findByTeacher(req.user.userId);
  }

  @Get('mine/overview') // NEW — must ALSO sit above ':id'. Courses + student/lesson counts + totals, for the teacher dashboard
  @ApiBearerAuth()
  @ApiOperation({ summary: "Teacher dashboard data: the logged-in teacher's courses with counts, plus totals" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  getMyOverview(@Req() req: any) {
    return this.coursesService.getTeacherOverview(req.user.userId);
  }

  @Get(':id') // MOVED — now comes after 'mine', so it only catches actual course IDs
  @ApiOperation({ summary: 'Get a single course by ID (public)' })
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Post() // unchanged
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course (teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  create(@Req() req: any, @Body() dto: CreateCourseDto) {
    return this.coursesService.create(req.user.userId, dto);
  }

  @Patch(':id/publish') // unchanged
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a draft course (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  publish(@Req() req: any, @Param('id') id: string) {
    return this.coursesService.publish(id, req.user.userId);
  }

  @Patch(':id') // NEW — edit details / set or remove the cover image
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a course: title, description, price, cover image (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, req.user.userId, dto);
  }
}
