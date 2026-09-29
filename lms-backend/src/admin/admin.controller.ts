import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common'; // CHANGED — added Delete, Param
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'; // Swagger decorators
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard'; // auth guard
import { RolesGuard } from 'src/common/roles.guard'; // role guard
import { Roles } from 'src/common/roles.decorator'; // role decorator
import { UserRole } from '../users/entities/user.entity'; // role enum
import { AdminService } from './admin.service'; // service
import { CreateTeacherDto } from './create-teacher.dto'; // DTO

@ApiTags('Admin') // groups under "Admin" in Swagger
@ApiBearerAuth() // every route here needs a token
@Controller('admin') // base path: /admin
@UseGuards(JwtAuthGuard, RolesGuard) // must be logged in AND have the right role
@Roles(UserRole.ADMIN) // admin-only for every route in this controller
export class AdminController {
  constructor(private adminService: AdminService) {} // injects the service

  @Post('create-teacher') // existing route, unchanged
  @ApiOperation({ summary: 'Create a teacher account (admin only)' })
  createTeacher(@Body() dto: CreateTeacherDto) {
    return this.adminService.createTeacher(dto);
  }

  @Get('teachers') // NEW — GET /admin/teachers
  @ApiOperation({ summary: 'List all teacher accounts (admin only)' }) // Swagger description
  listTeachers() {
    return this.adminService.listTeachers(); // returns all teachers, no passwords
  }

  @Delete('teachers/:id') // NEW — DELETE /admin/teachers/:id
  @ApiOperation({ summary: 'Permanently delete a teacher account (admin only)' })
  deleteTeacher(@Param('id') id: string) {
    return this.adminService.deleteTeacher(id);
  }

  @Get('courses') // NEW — GET /admin/courses
  @ApiOperation({ summary: 'List every course, any status, with its teacher (admin only)' })
  listAllCourses() {
    return this.adminService.listAllCourses();
  }
}