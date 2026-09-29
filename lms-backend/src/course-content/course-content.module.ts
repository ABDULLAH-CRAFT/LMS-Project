import { Module } from '@nestjs/common'; // Nest module decorator
import { TypeOrmModule } from '@nestjs/typeorm'; // entity registration
import { CourseModule } from './entities/course-module.entity'; // module entity
import { Lesson } from './entities/lesson.entity'; // lesson entity
import { LessonProgress } from '../progress/entities/lesson-progress.entity'; // NEW — cleaned up when a lesson is deleted
import { LessonResource } from '../lesson-resources/entities/lesson-resource.entity'; // NEW — files removed with the lesson
import { Assignment } from '../assignments/entities/assignment.entity'; // NEW
import { AssignmentSubmission } from '../submissions/entities/assignment-submission.entity'; // NEW
import { CourseContentService } from './course-content.service'; // service
import { CourseContentController } from './course-content.controller'; // controller
import { CoursesModule } from '../courses/courses.module'; // needed for CoursesService

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseModule, Lesson, LessonProgress, LessonResource, Assignment, AssignmentSubmission]),
    CoursesModule, // exports CoursesService
  ],
  providers: [CourseContentService],
  controllers: [CourseContentController],
})
export class CourseContentModule {}