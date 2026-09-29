import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity';
import { Lesson } from '../course-content/entities/lesson.entity';
import { CourseModule } from '../course-content/entities/course-module.entity';
import { CoursesModule } from '../courses/courses.module';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Lesson, CourseModule]), CoursesModule], // CoursesModule exports CoursesService
  providers: [AssignmentsService],
  controllers: [AssignmentsController],
})
export class AssignmentsModule {}