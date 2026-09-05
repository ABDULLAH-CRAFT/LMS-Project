import { Module } from '@nestjs/common'; // Nest module decorator
import { TypeOrmModule } from '@nestjs/typeorm'; // entity registration
import { Enrollment } from './entities/enrollment.entity'; // entity
import { EnrollmentsService } from './enrollments.service'; // service
import { EnrollmentsController } from './enrollments.controller'; // controller
import { CoursesModule } from '../courses/courses.module'; // needed so we can inject CoursesService
import { PaymentsModule } from 'src/payment/payment.module';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment]), CoursesModule,PaymentsModule], // registers the Enrollment repository AND imports CoursesModule for its exported service
  providers: [EnrollmentsService],
  controllers: [EnrollmentsController],
})
export class EnrollmentsModule {}