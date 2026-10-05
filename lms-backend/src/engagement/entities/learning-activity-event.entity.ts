import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { LearningAccessVia, LearningEventType } from '../engagement.enums';

// APPEND-ONLY. Managed ONLY by migrations (synchronize: false).
// Rows are written exclusively by EngagementService from trusted backend actions.
@Entity('learning_activity_events', { synchronize: false })
export class LearningActivityEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  studentId!: string;

  @Column({ type: 'uuid' })
  teacherId!: string; // derived from the course on the server, never from the client

  @Column({ type: 'uuid' })
  courseId!: string;

  @Column({ type: 'uuid', nullable: true })
  lessonId!: string | null;

  @Column({ type: 'enum', enum: LearningEventType, enumName: 'learning_event_type' })
  eventType!: LearningEventType;

  @Column({ type: 'int', default: 0 })
  points!: number; // 0 = tracked but not rewarded (see metadata.reason)

  @Column({ type: 'varchar', length: 20 })
  accessVia!: LearningAccessVia;

  @Column({ type: 'varchar', length: 200, unique: true })
  dedupeKey!: string; // makes recording idempotent

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  metadata!: Record<string, unknown>;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  occurredAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}