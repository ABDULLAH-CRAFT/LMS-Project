// lms-backend/src/courses/courses.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/entities/course.entity';
import { Enrollment } from 'src/enrollments/entities/enrollment.entity'; // NEW — needed for student counts in getTeacherOverview
import { CourseModule as CourseModuleEntity } from 'src/course-content/entities/course-module.entity'; // NEW — needed for lesson counts
import { Lesson } from 'src/course-content/entities/lesson.entity'; // NEW — needed for lesson counts
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';

@Module({
  // Registering Enrollment/CourseModuleEntity/Lesson here (in addition to
  // wherever their own modules register them) is safe — TypeOrmModule.forFeature
  // just gives THIS module its own injectable repository for that table, it
  // doesn't import EnrollmentsModule or CourseContentModule, so there's no
  // circular dependency (EnrollmentsModule already imports CoursesModule).
  imports: [TypeOrmModule.forFeature([Course, Enrollment, CourseModuleEntity, Lesson])],
  providers: [CoursesService],
  controllers: [CoursesController],
  exports: [CoursesService],
})
export class CoursesModule {}