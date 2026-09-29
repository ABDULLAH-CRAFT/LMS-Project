import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Lesson } from '../../course-content/entities/lesson.entity';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  courseId!: string; // stored directly so "all assignments for a course" is one simple query

  @Column()
  lessonId!: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' }) // if a lesson is ever deleted, its assignments go with it
  @JoinColumn({ name: 'lessonId' })
  lesson!: Lesson;

  @Column()
  title!: string; // e.g. "Week 1 problem set"

  @Column({ type: 'text' })
  description!: string; // the instructions students will read

  @Column({ type: 'timestamptz', nullable: true })
  dueDate!: Date | null; // null = no deadline

  @Column({ type: 'int', default: 100 })
  maxMarks!: number;

  @Column({ type: 'text', nullable: true })
  attachmentUrl!: string | null; // optional file (question paper, dataset...) — public URL under /uploads/assignments/

  @Column({ type: 'varchar', nullable: true })
  attachmentName!: string | null; // original file name, shown to the teacher/student

  @Column({ type: 'varchar', nullable: true })
  attachmentStoredName!: string | null; // random name on disk — needed so we can delete the file later

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}