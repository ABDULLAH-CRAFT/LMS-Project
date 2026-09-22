// Replace: lms-backend/src/payment/payment.module.ts
// (only change: added PaymentController to the controllers array)

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentItem } from './entities/payment-item.entity';
import { Enrollment } from 'src/enrollments/entities/enrollment.entity';
import { PaymentsService } from './payments.service';
import { PaymentController } from './payment.controller';
import { CartModule } from 'src/cart/cart.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentItem, Enrollment]), CartModule],
  controllers: [PaymentController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
