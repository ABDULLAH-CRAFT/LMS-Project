import { Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MembershipPlansService } from './membership-plans.service';
import { SubscriptionsService } from './subscriptions.service';
import { MembershipAccessService } from './membership-access.service';

@ApiTags('Memberships')
@Controller('memberships')
export class MembershipsController {
  constructor(
    private readonly plans: MembershipPlansService,
    private readonly subscriptions: SubscriptionsService,
    private readonly access: MembershipAccessService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Active membership plans (public pricing)' })
  listPlans() {
    return this.plans.listActive();
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: "The logged-in student's subscriptions" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  mine(@Req() req: any) {
    return this.subscriptions.listMine(req.user.userId); // studentId always comes from the JWT
  }

  @Get('me/courses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Published courses unlocked by my active membership' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  myCourses(@Req() req: any) {
    return this.access.listMembershipCourses(req.user.userId);
  }

  @Post('me/:subscriptionId/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel at period end (access continues until the paid period ends)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  cancel(@Req() req: any, @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string) {
    return this.subscriptions.cancel(req.user.userId, subscriptionId);
  }

  @Post('me/:subscriptionId/resume')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Undo a pending cancellation' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  resume(@Req() req: any, @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string) {
    return this.subscriptions.resume(req.user.userId, subscriptionId);
  }
}