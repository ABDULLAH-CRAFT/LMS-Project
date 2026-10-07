import { Module } from '@nestjs/common';
import { PayoutsModule } from '../payouts/payouts.module';
import { ReconciliationAdminController } from './reconciliation-admin.controller';
import { ReconciliationTraceService } from './reconciliation-trace.service';
import { ReconciliationService } from './reconciliation.service';

// Standalone and read-only: raw SQL through the shared DataSource.
// PayoutsModule is imported only for PayoutBalanceService (it imports nothing back, so no cycle).
@Module({
  imports: [PayoutsModule],
  controllers: [ReconciliationAdminController],
  providers: [ReconciliationService, ReconciliationTraceService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}