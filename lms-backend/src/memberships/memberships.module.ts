import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipPlan } from './entities/membership-plan.entity';
import { MembershipPlanCourse } from './entities/membership-plan-course.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity'; // R7
import { MembershipPlansService } from './membership-plans.service';
import { SubscriptionsService } from './subscriptions.service';
import { MembershipAccessService } from './membership-access.service';
import { MembershipCheckoutService } from './membership-checkout.service'; // R7
import { MembershipRevenueService } from './membership-revenue.service'; // R7
import { MembershipsController } from './memberships.controller';
import { AdminMembershipsController } from './admin-memberships.controller';
import { MembershipCheckoutController } from './membership-checkout.controller'; // R7
import { AdminMembershipRevenueController } from './admin-membership-revenue.controller'; // R7
import { PaymentsModule } from '../payment/payment.module'; // R7 - order creation, signature check, settlement
import { FinanceModule } from '../finance/finance.module'; // R7 - revenue rules

// Dependency direction: Memberships -> Payments -> Finance. PaymentsModule never imports this module
// (activation is a plain function it calls), so there is no cycle.
@Module({
  imports: [
    TypeOrmModule.forFeature([MembershipPlan, MembershipPlanCourse, Subscription, SubscriptionPayment]),
    PaymentsModule,
    FinanceModule,
  ],
  controllers: [
    MembershipsController,
    AdminMembershipsController,
    MembershipCheckoutController,
    AdminMembershipRevenueController,
  ],
  providers: [
    MembershipPlansService,
    SubscriptionsService,
    MembershipAccessService,
    MembershipCheckoutService,
    MembershipRevenueService,
  ],
  exports: [MembershipAccessService, SubscriptionsService, MembershipPlansService],
})
export class MembershipsModule {}