import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// One row per student — primary key IS the studentId, so there's never a
// separate "find settings for this user" ambiguity like there would be
// with an auto-generated id + a unique index.
@Entity('notification_settings')
export class NotificationSettings {
  @PrimaryColumn()
  studentId!: string;

  @Column({ default: true })
  courseUpdates!: boolean;

  @Column({ default: true })
  enrollmentConfirmations!: boolean;

  @Column({ default: false })
  marketingEmails!: boolean;

  @UpdateDateColumn()
  updatedAt!: Date;
}