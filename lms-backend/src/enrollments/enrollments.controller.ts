import { Controller, Post, Get, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { EnrollmentsService } from './enrollments.service';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { VerifyPaymentDto } from 'src/payment/dto/verify-payment.dto';
import { PaymentsService } from 'src/payment/payments.service';

@ApiTags('Enrollments')
@Controller('enrollments')
export class EnrollmentsController {
  constructor(
    private enrollmentsService: EnrollmentsService,
    private paymentsService: PaymentsService,
  ) {}

  @Post('checkout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start checkout for one or more courses' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  checkout(@Req() req: any, @Body() dto: CheckoutCartDto) {
    return this.enrollmentsService.checkoutCart(req.user.userId, dto);
  }

  @Post('verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a completed Razorpay payment and finalize enrollment' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  verify(@Req() req: any, @Body() dto: VerifyPaymentDto) {
    return this.enrollmentsService.confirmCart(req.user.userId, dto);
  }

  // No JWT guard — Razorpay calls this server-to-server. Trust comes from
  // the signature check below, not a bearer token.
  @Post('webhook/razorpay')
  @ApiExcludeEndpoint() // keep it out of the public Swagger docs
  async razorpayWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    if (!signature || !req.rawBody) {
      throw new BadRequestException('Missing webhook signature');
    }

    if (!this.paymentsService.verifyWebhookSignature(req.rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = req.body;
    if (event.event !== 'payment.captured') {
      return { received: true }; // ignore events we don't care about, but still 200 so Razorpay stops retrying
    }

    const paymentEntity = event.payload?.payment?.entity;
    if (!paymentEntity?.order_id || !paymentEntity?.id) {
      throw new BadRequestException('Malformed webhook payload');
    }

    await this.enrollmentsService.confirmFromWebhook(paymentEntity.order_id, paymentEntity.id);
    return { received: true };
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