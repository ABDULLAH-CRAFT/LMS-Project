import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MembershipPlansService } from './membership-plans.service';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionStatus } from './memberships.enums';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { PlanStatusDto } from './dto/plan-status.dto';
import { SetPlanCoursesDto } from './dto/set-plan-courses.dto';

@ApiTags('Admin Memberships')
@ApiBearerAuth()
@Controller('admin/memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminMembershipsController {
  constructor(
    private readonly plans: MembershipPlansService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'All membership plans incl. inactive, with subscriber counts' })
  listPlans() {
    return this.plans.listAdmin();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a membership plan' })
  createPlan(@Body() dto: CreateMembershipPlanDto) {
    return this.plans.create(dto);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Edit name / description / price / billing period' })
  updatePlan(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMembershipPlanDto) {
    return this.plans.update(id, dto);
  }

  @Patch('plans/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a plan (deactivating blocks NEW sign-ups only)' })
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PlanStatusDto) {
    return this.plans.setStatus(id, dto.status);
  }

  @Put('plans/:id/courses')
  @ApiOperation({ summary: 'Replace the courses included in a plan' })
  setCourses(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetPlanCoursesDto) {
    return this.plans.setCourses(id, dto);
  }

  @Get('subscriptions/summary')
  @ApiOperation({ summary: 'Subscriber counts by state' })
  summary() {
    return this.subscriptions.summaryForAdmin();
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Paged subscriber list, optional ?status=' })
  listSubscriptions(
    @Query('status') status?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    if (status && !Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)) {
      throw new BadRequestException('Unknown subscription status');
    }
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return this.subscriptions.listForAdmin(
      status as SubscriptionStatus | undefined,
      safeLimit,
      Math.max(offset, 0),
    );
  }
}