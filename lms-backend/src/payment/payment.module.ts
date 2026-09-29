import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { PaymentItem } from './entities/payment-item.entity';
import { Enrollment } from 'src/enrollments/entities/enrollment.entity';
import { PaymentsService } from './payments.service';
import { PaymentSettlementService } from './payment-settlement.service';
import { RefundService } from './refund.service';
import { PaymentController } from './payment.controller';
import { RefundController } from './refund.controller';
import { PaymentsGateway } from './payments.gateway';
import { CartModule } from 'src/cart/cart.module';
import { FinanceModule } from 'src/finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentItem, Enrollment]),
    CartModule,
    FinanceModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [PaymentController, RefundController], // R3: + RefundController
  providers: [PaymentsService, PaymentSettlementService, RefundService, PaymentsGateway], // R3: + RefundService
  exports: [PaymentsService, PaymentSettlementService, RefundService, PaymentsGateway],
})
export class PaymentsModule {}
