import { Module } from '@nestjs/common';
import { PayoutBalanceService } from './payout-balance.service';
import { PayoutSettingsService } from './payout-settings.service';
import { PayoutsAdminController } from './payouts-admin.controller';
import { PayoutsTeacherController } from './payouts-teacher.controller';
import { PayoutsService } from './payouts.service';

// Standalone: uses the shared DataSource and raw SQL only, so it imports no other feature module (no cycles).
@Module({
  controllers: [PayoutsAdminController, PayoutsTeacherController],
  providers: [PayoutSettingsService, PayoutBalanceService, PayoutsService],
  exports: [PayoutsService, PayoutBalanceService, PayoutSettingsService],
})
export class PayoutsModule {}