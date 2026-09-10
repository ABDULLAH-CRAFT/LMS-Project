import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { CoursesService } from '../courses/courses.service';
import { PaymentsService } from 'src/payment/payments.service';
import { Payment, PaymentStatus } from 'src/payment/entities/payment.entity';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { VerifyPaymentDto } from 'src/payment/dto/verify-payment.dto';
import { CartService } from 'src/cart/cart.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    private coursesService: CoursesService,
    private paymentsService: PaymentsService,
    private cartService: CartService,
  ) {}

  async checkoutCart(studentId: string, dto: CheckoutCartDto) {
    const explicitIds = dto.courseIds && dto.courseIds.length > 0 ? dto.courseIds : null;
    const courseIds = explicitIds ?? (await this.cartService.getCourseIdsForStudent(studentId));

    if (!courseIds || courseIds.length === 0) {
      throw new ConflictException('Your cart is empty');
    }

    const uniqueCourseIds = [...new Set(courseIds)];

    const alreadyEnrolled = await this.enrollmentRepo.find({
      where: uniqueCourseIds.map((courseId) => ({ studentId, courseId })),
    });
    const alreadyEnrolledIds = new Set(alreadyEnrolled.map((e) => e.courseId));
    const toProcess = uniqueCourseIds.filter((id) => !alreadyEnrolledIds.has(id));

    if (toProcess.length === 0) {
      throw new ConflictException('Already enrolled in all selected courses');
    }

    const courses = await Promise.all(toProcess.map((id) => this.coursesService.findOne(id)));
    const freeCourses = courses.filter((course) => Number(course.price) <= 0);
    const paidCourses = courses.filter((course) => Number(course.price) > 0);

    for (const course of freeCourses) {
      const enrollment = this.enrollmentRepo.create({ studentId, courseId: course.id });
      await this.enrollmentRepo.save(enrollment);
    }

    if (freeCourses.length > 0) {
      await this.cartService.removeItems(studentId, freeCourses.map((course) => course.id));
    }

    if (paidCourses.length === 0) {
      return { free: true, enrolledCourseIds: freeCourses.map((course) => course.id) };
    }

    const lineItems = paidCourses.map((course) => ({
      referenceType: 'course_enrollment',
      referenceId: course.id,
      amount: Number(course.price),
      quantity: 1,
    }));

    const order = await this.paymentsService.createOrderForItems(studentId, lineItems, 'INR');

    return {
      free: false,
      freeCoursesEnrolled: freeCourses.map((course) => course.id),
      ...order,
    };
  }

  /** Called after the frontend's Razorpay payment succeeds. */
  async confirmCart(studentId: string, dto: VerifyPaymentDto) {
    const payment = await this.paymentsService.verifyAndConfirm(studentId, dto);

    if (payment.status !== PaymentStatus.PAID) {
      throw new NotFoundException('Payment was not completed');
    }

    return { enrollments: await this.createEnrollmentsFromPayment(studentId, payment) };
  }

  /**
   * Called by the Razorpay webhook — the safety net for when the client
   * never calls /verify (app closed/crashed/network dropped right after
   * paying). Idempotent: safe to call multiple times for the same payment.
   */
  async confirmFromWebhook(providerOrderId: string, providerPaymentId: string) {
    const payment = await this.paymentsService.findByProviderOrderId(providerOrderId);
    if (!payment) {
      throw new NotFoundException(`No payment found for order ${providerOrderId}`);
    }

    // Already fully processed (either by the client's own /verify call, or
    // a duplicate webhook delivery) — nothing left to do.
    const alreadyPaid = payment.status === PaymentStatus.PAID;

    const confirmed = alreadyPaid
      ? payment
      : await this.paymentsService.markPaidFromWebhook(providerOrderId, providerPaymentId);

    if (!confirmed) {
      throw new NotFoundException(`No payment found for order ${providerOrderId}`);
    }

    return { enrollments: await this.createEnrollmentsFromPayment(confirmed.userId, confirmed) };
  }

  /** Shared by confirmCart and confirmFromWebhook — creates one Enrollment
   *  per course_enrollment item in the payment (skipping ones that already
   *  exist), then drops those courses from the cart. Safe to call twice for
   *  the same payment — it just returns the existing enrollments. */
  private async createEnrollmentsFromPayment(studentId: string, payment: Payment) {
    const enrollments: Enrollment[] = [];
    const paidCourseIds: string[] = [];

    for (const item of payment.items) {
      if (item.referenceType !== 'course_enrollment') continue;
      paidCourseIds.push(item.referenceId);

      const existing = await this.enrollmentRepo.findOne({
        where: { studentId, courseId: item.referenceId },
      });

      if (existing) {
        enrollments.push(existing);
        continue;
      }

      const enrollment = this.enrollmentRepo.create({ studentId, courseId: item.referenceId });
      enrollments.push(await this.enrollmentRepo.save(enrollment));
    }

    await this.cartService.removeItems(studentId, paidCourseIds);
    return enrollments;
  }

  findMyEnrollments(studentId: string) {
    return this.enrollmentRepo.find({
      where: { studentId },
      order: { enrolledAt: 'DESC' },
      relations: { course: true },
    });
  }

  async isEnrolled(studentId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.enrollmentRepo.findOne({ where: { studentId, courseId } });
    return !!enrollment;
  }
}