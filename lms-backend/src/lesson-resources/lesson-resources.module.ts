import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonResource } from './entities/lesson-resource.entity';
import { Lesson } from '../course-content/entities/lesson.entity';
import { CourseModule } from '../course-content/entities/course-module.entity';
import { CoursesModule } from '../courses/courses.module';
import { LessonResourcesService } from './lesson-resources.service';
import { LessonResourcesController } from './lesson-resources.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LessonResource, Lesson, CourseModule]), CoursesModule], // CoursesModule exports CoursesService
  providers: [LessonResourcesService],
  controllers: [LessonResourcesController],
})
export class LessonResourcesModule {}