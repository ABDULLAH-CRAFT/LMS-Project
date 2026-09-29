import { Module } from '@nestjs/common'; // Nest module decorator
import { TypeOrmModule } from '@nestjs/typeorm'; // registers entities for this module
import { Course } from 'src/entities/course.entity'; // Course entity
import { Enrollment } from 'src/enrollments/entities/enrollment.entity'; // NEW — needed for student counts in getTeacherOverview
import { CourseModule as CourseModuleEntity } from 'src/course-content/entities/course-module.entity'; // NEW — needed for lesson counts
import { Lesson } from 'src/course-content/entities/lesson.entity'; // NEW — needed for lesson counts
import { CoursesService } from './courses.service'; // service
import { CoursesController } from './courses.controller'; // controller

@Module({
  // Registering Enrollment/CourseModuleEntity/Lesson here (in addition to
  // wherever their own modules register them) is safe — TypeOrmModule.forFeature
  // just gives THIS module its own injectable repository for that table, it
  // doesn't import EnrollmentsModule or CourseContentModule, so there's no
  // circular dependency (EnrollmentsModule already imports CoursesModule).
  imports: [TypeOrmModule.forFeature([Course, Enrollment, CourseModuleEntity, Lesson])],
  providers: [CoursesService], // registers the service
  controllers: [CoursesController], // registers the controller
  exports: [CoursesService], // without this, EnrollmentsModule can't inject CoursesService to check if a course exists
})
export class CoursesModule {}