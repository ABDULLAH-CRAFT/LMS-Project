import { Module } from '@nestjs/common'; // Nest module decorator
import { TypeOrmModule } from '@nestjs/typeorm'; // registers entities for this module
import { Course } from 'src/entities/course.entity'; // Course entity
import { CoursesService } from './courses.service'; // service
import { CoursesController } from './courses.controller'; // controller

@Module({
  imports: [TypeOrmModule.forFeature([Course])], // registers the Course repository
  providers: [CoursesService], // registers the service
  controllers: [CoursesController], // registers the controller
  exports: [CoursesService], // NEW — without this, EnrollmentsModule can't inject CoursesService to check if a course exists
})
export class CoursesModule {}