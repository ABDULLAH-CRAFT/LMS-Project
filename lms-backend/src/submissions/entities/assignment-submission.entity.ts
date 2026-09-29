import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Assignment } from '../../assignments/entities/assignment.entity';

@Entity('assignment_submissions')
@Unique(['assignmentId', 'studentId']) // one submission per student per assignment (resubmitting updates it)
export class AssignmentSubmission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  assignmentId!: string;

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' }) // deleting an assignment removes its submissions
  @JoinColumn({ name: 'assignmentId' })
  assignment!: Assignment;

  @Column()
  courseId!: string; // denormalized so "all submissions in a course" is one simple query

  @Column()
  studentId!: string;

  @Column({ type: 'text', nullable: true })
  textAnswer!: string | null; // written answer, optional if a file is attached

  @Column({ type: 'text', nullable: true })
  fileUrl!: string | null; // public URL under /uploads/submissions/

  @Column({ type: 'varchar', nullable: true })
  fileName!: string | null; // original file name

  @Column({ type: 'varchar', nullable: true })
  fileStoredName!: string | null; // random name on disk, needed to delete the file later

  @Column({ type: 'timestamptz', default: () => 'now()' })
  submittedAt!: Date; // refreshed on every resubmission

  @Column({ type: 'boolean', default: false })
  isLate!: boolean; // true if submitted after the assignment's due date

  @Column({ type: 'int', nullable: true })
  grade!: number | null; // null = not graded yet

  @Column({ type: 'text', nullable: true })
  feedback!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  gradedAt!: Date | null; // null = not graded yet

  @Column({ type: 'varchar', nullable: true })
  gradedById!: string | null; // the teacher who graded it
}