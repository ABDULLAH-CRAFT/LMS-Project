import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { VerifyPaymentDto } from '../payment/dto/verify-payment.dto';
import { CheckoutMembershipDto } from './dto/checkout-membership.dto';
import { MembershipCheckoutService } from './membership-checkout.service';

@ApiTags('Memberships')
@ApiBearerAuth()
@Controller('memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class MembershipCheckoutController {
  constructor(private readonly checkoutService: MembershipCheckoutService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Start paying for one month of a membership plan' })
  checkout(@Req() req: any, @Body() dto: CheckoutMembershipDto) {
    return this.checkoutService.checkout(req.user.userId, dto.planId);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify the Razorpay payment and activate / renew the subscription' })
  verify(@Req() req: any, @Body() dto: VerifyPaymentDto) {
    return this.checkoutService.verify(req.user.userId, dto);
  }
}