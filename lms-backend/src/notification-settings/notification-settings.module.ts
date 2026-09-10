import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationSettings } from './entities/notification-setting.entity';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationSettingsController } from './notification-setting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationSettings])],
  providers: [NotificationSettingsService],
  controllers: [NotificationSettingsController],
  exports: [NotificationSettingsService], // so MailModule can check preferences before sending, once those email flows exist
})
export class NotificationSettingsModule {}