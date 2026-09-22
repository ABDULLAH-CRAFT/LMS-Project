// Replace: lms-backend/src/payment/payment.module.ts
// (only change: added PaymentController to the controllers array)

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentItem } from './entities/payment-item.entity';
import { PaymentsService } from './payments.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentItem])],
  controllers: [PaymentController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
