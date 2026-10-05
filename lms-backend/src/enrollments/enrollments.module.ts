import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { CoursesModule } from '../courses/courses.module';
import { PaymentsModule } from 'src/payment/payment.module';
import { CartModule } from 'src/cart/cart.module';
import { MembershipsModule } from 'src/memberships/memberships.module'; // R6 — membership entitlement check

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment]), CoursesModule, PaymentsModule, CartModule, MembershipsModule],
  providers: [EnrollmentsService],
  controllers: [EnrollmentsController],
})
export class EnrollmentsModule {}