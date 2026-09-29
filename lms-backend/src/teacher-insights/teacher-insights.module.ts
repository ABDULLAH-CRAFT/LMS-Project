import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { LessonProgress } from '../progress/entities/lesson-progress.entity';
import { Lesson } from '../course-content/entities/lesson.entity';
import { PaymentItem } from '../payment/entities/payment-item.entity';
import { User } from '../users/entities/user.entity';
import { CoursesModule } from '../courses/courses.module';
import { TeacherInsightsService } from './teacher-insights.service';
import { TeacherInsightsController } from './teacher-insights.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, Enrollment, LessonProgress, Lesson, PaymentItem, User]),
    CoursesModule, // exports CoursesService
  ],
  providers: [TeacherInsightsService],
  controllers: [TeacherInsightsController],
})
export class TeacherInsightsModule {}