import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Lesson } from '../course-content/entities/lesson.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { User } from '../users/entities/user.entity';
import { CoursesModule } from '../courses/courses.module';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssignmentSubmission, Assignment, Lesson, Enrollment, User]),
    CoursesModule, // exports CoursesService
  ],
  providers: [SubmissionsService],
  controllers: [SubmissionsController],
})
export class SubmissionsModule {}