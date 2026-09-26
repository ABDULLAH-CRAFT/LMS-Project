// lms-backend/src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { CoursesModule } from '../courses/courses.module'; // NEW — needed for the has-courses check before deleting a teacher

@Module({
  imports: [UsersModule, MailModule, CoursesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}