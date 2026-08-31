import { Module } from '@nestjs/common'; // Nest module decorator
import { TypeOrmModule } from '@nestjs/typeorm'; // entity registration
import { CourseModule } from './entities/course-module.entity'; // module entity
import { Lesson } from './entities/lesson.entity'; // lesson entity
import { CourseContentService } from './course-content.service'; // service
import { CourseContentController } from './course-content.controller'; // controller
import { CoursesModule } from '../courses/courses.module'; // needed for CoursesService

@Module({
  imports: [TypeOrmModule.forFeature([CourseModule, Lesson]), CoursesModule], // registers both entities + imports CoursesModule for its exported service
  providers: [CourseContentService],
  controllers: [CourseContentController],
})
export class CourseContentModule {} // NOTE: rename the generated class if `nest g module` named it differently — check the file matches this exactly