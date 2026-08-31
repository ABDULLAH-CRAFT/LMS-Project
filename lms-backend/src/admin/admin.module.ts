import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [UsersModule, MailModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}