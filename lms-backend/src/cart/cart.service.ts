import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { CoursesService } from '../courses/courses.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem) private cartRepo: Repository<CartItem>,
    private coursesService: CoursesService,
  ) {}

  /** Returns the student's cart as a plain list of Course objects — matches
   *  the shape the frontend/mobile CartContext already expects. */
  async getCart(studentId: string) {
    const items = await this.cartRepo.find({
      where: { studentId },
      order: { addedAt: 'ASC' },
    });
    return items.map((item) => item.course);
  }

  /** Just the course IDs — used internally by checkout when the client
   *  doesn't send explicit courseIds (i.e. "check out my whole cart"). */
  async getCourseIdsForStudent(studentId: string): Promise<string[]> {
    const items = await this.cartRepo.find({ where: { studentId } });
    return items.map((item) => item.courseId);
  }

  async addItem(studentId: string, courseId: string) {
    await this.coursesService.findOne(courseId); // 404s if the course doesn't exist

    const existing = await this.cartRepo.findOne({ where: { studentId, courseId } });
    if (existing) return existing; // already in cart — treat as success, not an error

    const item = this.cartRepo.create({ studentId, courseId });
    return this.cartRepo.save(item);
  }

  async removeItem(studentId: string, courseId: string) {
    await this.cartRepo.delete({ studentId, courseId });
    return { removed: true };
  }

  /** Removes several courses at once — used after checkout/payment success
   *  to convert "in cart" into "owned" by dropping the cart rows. */
  async removeItems(studentId: string, courseIds: string[]) {
    if (courseIds.length === 0) return;
    await this.cartRepo.delete({ studentId, courseId: In(courseIds) });
  }

  async clearCart(studentId: string) {
    await this.cartRepo.delete({ studentId });
    return { cleared: true };
  }
}