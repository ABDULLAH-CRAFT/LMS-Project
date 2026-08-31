import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common'; // Req reads the logged-in user off the request
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'; // Swagger decorators
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard'; // requires a valid token
import { RolesGuard } from 'src/common/roles.guard'; // requires the right role
import { Roles } from 'src/common/roles.decorator'; // role decorator
import { UserRole } from '../users/entities/user.entity'; // role enum
import { EnrollmentsService } from './enrollments.service'; // service
import { CreateEnrollmentDto } from './dto/create-enrollment.dto'; // DTO

@ApiTags('Enrollments') // groups routes under "Enrollments" in Swagger
@Controller('enrollments') // base path: /enrollments
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {} // injects the service

  @Post() // POST /enrollments
  @ApiBearerAuth() // needs a token
  @ApiOperation({ summary: 'Enroll the logged-in student in a course' }) // Swagger description
  @UseGuards(JwtAuthGuard, RolesGuard) // must be logged in AND have the right role
  @Roles(UserRole.STUDENT) // only students can enroll — teachers/admins get a 403
  enroll(@Req() req: any, @Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.enroll(req.user.userId, dto); // studentId comes from the JWT, never the request body
  }

  @Get('mine') // GET /enrollments/mine
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the logged-in student's enrolled courses" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findMine(@Req() req: any) {
    return this.enrollmentsService.findMyEnrollments(req.user.userId);
  }

  @Get('check/:courseId') // GET /enrollments/check/:courseId
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if the logged-in student is enrolled in a specific course' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async checkEnrollment(@Req() req: any, @Param('courseId') courseId: string) {
    const enrolled = await this.enrollmentsService.isEnrolled(req.user.userId, courseId); // returns true/false
    return { enrolled }; // wrapped in an object so the response shape is consistent/extensible
  }
}