// lms-backend/src/admin/admin.controller.ts
import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import { CreateTeacherDto } from './create-teacher.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('create-teacher')
  @ApiOperation({ summary: 'Create a teacher account (admin only)' })
  createTeacher(@Body() dto: CreateTeacherDto) {
    return this.adminService.createTeacher(dto);
  }

  @Get('teachers')
  @ApiOperation({ summary: 'List all teacher accounts (admin only)' })
  listTeachers() {
    return this.adminService.listTeachers();
  }

  @Delete('teachers/:id')
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