import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonProgress } from './entities/lesson-progress.entity';
import { Lesson } from '../course-content/entities/lesson.entity';
import { CourseModule } from '../course-content/entities/course-module.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress..controller';

@Module({
  imports: [TypeOrmModule.forFeature([LessonProgress, Lesson, CourseModule, Enrollment])],
  providers: [ProgressService],
  controllers: [ProgressController],
})
export class ProgressModule {}