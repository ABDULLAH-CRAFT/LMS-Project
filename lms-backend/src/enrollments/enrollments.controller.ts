import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { EnrollmentsService } from './enrollments.service';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { VerifyPaymentDto } from 'src/payment/dto/verify-payment.dto';

@ApiTags('Enrollments')
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  @Post('checkout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start checkout for one or more courses — free ones enroll instantly, paid ones return a single combined Razorpay order' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  checkout(@Req() req: any, @Body() dto: CheckoutCartDto) {
    return this.enrollmentsService.checkoutCart(req.user.userId, dto);
  }

  @Post('verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a completed Razorpay payment and finalize enrollment for every course in the order' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  verify(@Req() req: any, @Body() dto: VerifyPaymentDto) {
    return this.enrollmentsService.confirmCart(req.user.userId, dto);
  }

  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the logged-in student's enrolled courses" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findMine(@Req() req: any) {
    return this.enrollmentsService.findMyEnrollments(req.user.userId);
  }

  @Get('check/:courseId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if the logged-in student is enrolled in a specific course' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async checkEnrollment(@Req() req: any, @Param('courseId') courseId: string) {
    const enrolled = await this.enrollmentsService.isEnrolled(req.user.userId, courseId);
    return { enrolled };
  }
}