import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { EngagementScoreService } from './engagement-score.service';
import { EngagementWeightsService } from './engagement-weights.service';

const PERCENT = /^\d{1,3}(\.\d{1,2})?$/;

export class CreateEngagementWeightsDto {
  @IsString() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'effectiveMonth must look like 2026-11' })
  effectiveMonth!: string;

  @IsString() @Matches(PERCENT, { message: 'lessonCompletion must be a percentage such as 40 or 40.50' })
  lessonCompletion!: string;

  @IsString() @Matches(PERCENT, { message: 'courseCompletion must be a percentage' })
  courseCompletion!: string;

  @IsString() @Matches(PERCENT, { message: 'assessment must be a percentage' })
  assessment!: string;

  @IsString() @Matches(PERCENT, { message: 'returningLearner must be a percentage' })
  returningLearner!: string;

  @IsString() @Matches(PERCENT, { message: 'rating must be a percentage' })
  rating!: string;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

@ApiTags('Admin Engagement Scores')
@ApiBearerAuth()
@Controller('admin/engagement')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class EngagementScoreAdminController {
  constructor(
    private readonly scores: EngagementScoreService,
    private readonly weights: EngagementWeightsService,
  ) {}

  @Get('weights')
  @ApiOperation({ summary: 'All engagement weight configurations (effective-dated, newest first)' })
  listWeights() {
    return this.weights.list();
  }

  @Post('weights')
  @ApiOperation({ summary: 'Schedule new engagement weights from the 1st of a future month' })
  createWeights(@Req() req: any, @Body() dto: CreateEngagementWeightsDto) {
    return this.weights.create(dto, req.user.userId);
  }

  @Get('scores/periods')
  @ApiOperation({ summary: 'Revenue periods with their latest engagement calculation' })
  periods() {
    return this.scores.listPeriods();
  }

  @Post('scores/periods/:periodId/calculate')
  @ApiOperation({ summary: 'Calculate and freeze a new engagement score run for a period (refused once the period is finalized)' })
  calculate(@Req() req: any, @Param('periodId', ParseUUIDPipe) periodId: string) {
    return this.scores.calculatePeriod(periodId, req.user.userId);
  }

  @Get('scores/periods/:periodId/runs')
  @ApiOperation({ summary: 'All calculation runs for a period' })
  runs(@Param('periodId', ParseUUIDPipe) periodId: string) {
    return this.scores.listRuns(periodId);
  }

  @Get('scores/periods/:periodId/latest')
  @ApiOperation({ summary: 'Latest frozen calculation for a period' })
  latest(@Param('periodId', ParseUUIDPipe) periodId: string) {
    return this.scores.getLatestRunForPeriod(periodId);
  }

  @Get('scores/runs/:runId')
  @ApiOperation({ summary: 'One frozen calculation run, exactly as stored' })
  run(@Param('runId', ParseUUIDPipe) runId: string) {
    return this.scores.getRun(runId);
  }
}