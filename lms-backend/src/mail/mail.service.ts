import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('MAIL_HOST'),
      port: Number(this.config.getOrThrow('MAIL_PORT')),
      auth: {
        user: this.config.getOrThrow<string>('MAIL_USER'),
        pass: this.config.getOrThrow<string>('MAIL_PASS'),
      },
    });
  }

  private renderTemplate(
    fileName: string,
    replacements: Record<string, string>,
  ): string {
    // Always read templates from src/mail while developing
    const filePath = path.join(process.cwd(), 'src', 'mail', fileName);

    let html = fs.readFileSync(filePath, 'utf8');

    for (const [key, value] of Object.entries(replacements)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }

    return html;
  }

  async sendWelcomeEmail(to: string, name: string) {
    const html = this.renderTemplate('welcome.hbs', { name });

    const info = await this.transporter.sendMail({
      from: this.config.getOrThrow<string>('MAIL_FROM'),
      to,
      subject: 'Welcome to the LMS!',
      html,
    });

    console.log('Email sent:', info);
  }

  async sendTeacherInviteEmail(
    to: string,
    name: string,
    tempPassword: string,
  ) {
    const html = this.renderTemplate('teacher-invite.hbs', {
      name,
      email: to,
      password: tempPassword,
    });

    const info = await this.transporter.sendMail({
      from: this.config.getOrThrow<string>('MAIL_FROM'),
      to,
      subject: 'You have been added as a teacher',
      html,
    });

    console.log('Email sent:', info);
  }
}