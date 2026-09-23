// Replace: lms-backend/src/payment/payment.module.ts
// (only change: added PaymentController to the controllers array)

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { PaymentItem } from './entities/payment-item.entity';
import { Enrollment } from 'src/enrollments/entities/enrollment.entity';
import { PaymentsService } from './payments.service';
import { PaymentController } from './payment.controller';
import { PaymentsGateway } from './payments.gateway';
import { CartModule } from 'src/cart/cart.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentItem, Enrollment]),
    CartModule,
    // Own JwtModule registration (separate from AuthModule's) so the
    // gateway can verify the same access tokens without AuthModule
    // needing to export anything.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [PaymentController],
  providers: [PaymentsService, PaymentsGateway],
  exports: [PaymentsService, PaymentsGateway],
})
export class PaymentsModule {}
