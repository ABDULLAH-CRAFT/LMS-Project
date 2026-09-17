import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Unique } from 'typeorm';

@Entity('lesson_progress')
@Unique(['studentId', 'lessonId']) // a student can only complete a given lesson once
export class LessonProgress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  studentId!: string;

  @Column()
  lessonId!: string;

  @Column()
  courseId!: string; // denormalized from the lesson's module, so course-level progress needs no extra joins

  @CreateDateColumn()
  completedAt!: Date; // this row existing IS "completed" — no separate boolean needed, keeps it simple
}