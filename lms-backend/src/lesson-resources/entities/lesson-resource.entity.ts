import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Lesson } from '../../course-content/entities/lesson.entity';

@Entity('lesson_resources')
export class LessonResource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  courseId!: string; // stored directly so "all notes for a course" is one simple query

  @Column()
  lessonId!: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' }) // if a lesson is ever deleted, its notes rows go with it
  @JoinColumn({ name: 'lessonId' })
  lesson!: Lesson;

  @Column()
  title!: string; // what the teacher typed, e.g. "Week 1 slides"

  @Column()
  fileName!: string; // original name of the uploaded file, e.g. "week1.pdf"

  @Column()
  storedName!: string; // random name on disk — needed so we can delete the file later

  @Column({ type: 'text' })
  fileUrl!: string; // public URL served by main.ts's /uploads/ static route

  @Column({ default: '' })
  mimeType!: string;

  @Column({ type: 'int', default: 0 })
  sizeBytes!: number;

  @CreateDateColumn()
  createdAt!: Date;
}