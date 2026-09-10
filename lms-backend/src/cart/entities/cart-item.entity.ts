import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, Unique } from 'typeorm';
import { Course } from 'src/entities/course.entity';

// One row per course a student has added to their cart. There's no separate
// "Cart" table — a student's cart is just "all CartItem rows where
// studentId = them". Rows are removed once their course is enrolled (free)
// or paid for (see EnrollmentsService.checkoutCart/confirmCart).
@Entity('cart_items')
@Unique(['studentId', 'courseId']) // can't add the same course twice
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  studentId!: string;

  @Column()
  courseId!: string; // raw FK, same pattern as Course.teacherId — quick lookups without a join

  @ManyToOne(() => Course, { eager: true, onDelete: 'CASCADE' })
  course!: Course; // eager: true — every CartItem query also loads its Course automatically

  @CreateDateColumn()
  addedAt!: Date;
}