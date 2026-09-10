import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSettings } from './entities/notification-setting.entity';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

const DEFAULTS = {
  courseUpdates: true,
  enrollmentConfirmations: true,
  marketingEmails: false,
};

@Injectable()
export class NotificationSettingsService {
  constructor(
    @InjectRepository(NotificationSettings)
    private repo: Repository<NotificationSettings>,
  ) {}

  /** Returns the student's saved settings, or the defaults if they've never changed anything. */
  async getForStudent(studentId: string) {
    const existing = await this.repo.findOne({ where: { studentId } });
    return existing ?? { studentId, ...DEFAULTS };
  }

  async update(studentId: string, dto: UpdateNotificationSettingsDto) {
    let settings = await this.repo.findOne({ where: { studentId } });
    if (!settings) {
      settings = this.repo.create({ studentId, ...DEFAULTS });
    }
    Object.assign(settings, dto);
    return this.repo.save(settings);
  }

  /** Used by the mail service before sending a course-update or marketing email. Defaults to true/false per DEFAULTS if the student never set a preference. */
  async isEnabled(studentId: string, key: keyof typeof DEFAULTS): Promise<boolean> {
    const settings = await this.getForStudent(studentId);
    return settings[key];
  }
}