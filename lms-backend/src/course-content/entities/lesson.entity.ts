import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm'; // TypeORM decorators
import { CourseModule } from './course-module.entity'; // for the module relation

export enum LessonContentType { // what kind of content this lesson holds
  TEXT = 'text', // plain written lesson content
  VIDEO = 'video', // a video URL (e.g. YouTube/Vimeo link)
}

@Entity('lessons') // table name
export class Lesson {
  @PrimaryGeneratedColumn('uuid') // auto-generated ID
  id!: string;

  @Column()
  moduleId!: string; // raw foreign key for fast lookups

  @ManyToOne(() => CourseModule, { eager: false }) // many lessons belong to one module
  module!: CourseModule;

  @Column()
  title!: string; // e.g. "Introduction to Variables"

  @Column({ type: 'enum', enum: LessonContentType, default: LessonContentType.TEXT }) // defaults to text content
  contentType!: LessonContentType;

  @Column({ type: 'text' }) // holds either the written lesson text OR a video URL, depending on contentType
  content!: string;

  @Column({ type: 'int', default: 0 }) // controls display order within the module
  order!: number;
}