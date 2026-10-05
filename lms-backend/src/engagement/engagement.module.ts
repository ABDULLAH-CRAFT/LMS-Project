import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningActivityEvent } from './entities/learning-activity-event.entity';
import { EngagementService } from './engagement.service';
import { EngagementQueryService } from './engagement-query.service';
import { EngagementAdminController } from './engagement-admin.controller';
import { EngagementWeightsService } from './engagement-weights.service'; // R9
import { EngagementScoreService } from './engagement-score.service'; // R9
import { EngagementScoreAdminController } from './engagement-score-admin.controller'; // R9
import { MembershipsModule } from '../memberships/memberships.module'; // for MembershipAccessService

// Dependency direction: Progress/Submissions -> Engagement -> Memberships. No cycle.
@Module({
  imports: [TypeOrmModule.forFeature([LearningActivityEvent]), MembershipsModule],
  controllers: [EngagementAdminController, EngagementScoreAdminController],
  providers: [EngagementService, EngagementQueryService, EngagementWeightsService, EngagementScoreService],
  exports: [EngagementService, EngagementScoreService, EngagementWeightsService],
})
export class EngagementModule {}