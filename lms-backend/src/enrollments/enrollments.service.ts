import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { CoursesService } from '../courses/courses.service';
import { PaymentsService } from 'src/payment/payments.service';
import { PaymentStatus } from 'src/payment/entities/payment.entity';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { VerifyPaymentDto } from 'src/payment/dto/verify-payment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    private coursesService: CoursesService,
    private paymentsService: PaymentsService,
  ) {}

  /**
   * Starts checkout for one or more courses at once.
   *
   * Free courses are enrolled immediately.
   * Paid courses are sent to Razorpay as one payment order.
   */
  async checkoutCart(studentId: string, dto: CheckoutCartDto) {
    const uniqueCourseIds = [...new Set(dto.courseIds)];

    const alreadyEnrolled = await this.enrollmentRepo.find({
      where: uniqueCourseIds.map((courseId) => ({
        studentId,
        courseId,
      })),
    });

    const alreadyEnrolledIds = new Set(
      alreadyEnrolled.map((e) => e.courseId),
    );

    const toProcess = uniqueCourseIds.filter(
      (id) => !alreadyEnrolledIds.has(id),
    );

    if (toProcess.length === 0) {
      throw new ConflictException(
        'Already enrolled in all selected courses',
      );
    }

    const courses = await Promise.all(
      toProcess.map((id) => this.coursesService.findOne(id)),
    );

    const freeCourses = courses.filter(
      (course) => Number(course.price) <= 0,
    );

    const paidCourses = courses.filter(
      (course) => Number(course.price) > 0,
    );

    // Enroll in free courses immediately
    for (const course of freeCourses) {
      const enrollment = this.enrollmentRepo.create({
        studentId,
        courseId: course.id,
      });

      await this.enrollmentRepo.save(enrollment);
    }

    // If there are no paid courses, we're done
    if (paidCourses.length === 0) {
      return {
        free: true,
        enrolledCourseIds: freeCourses.map((course) => course.id),
      };
    }

    // Payment items sent to the payment service
    const lineItems = paidCourses.map((course) => ({
      referenceType: 'course_enrollment',
      referenceId: course.id,
      amount: Number(course.price),
      quantity: 1,
    }));

    // Create one payment order for all paid courses
    const order = await this.paymentsService.createOrderForItems(
      studentId,
      lineItems,
      'INR',
    );

    return {
      free: false,
      freeCoursesEnrolled: freeCourses.map((course) => course.id),
      ...order,
    };
  }

  /**
   * Called after the frontend's Razorpay payment succeeds.
   *
   * Verifies the payment and creates one Enrollment
   * for every course_enrollment item in the payment.
   */
  async confirmCart(
    studentId: string,
    dto: VerifyPaymentDto,
  ) {
    const payment = await this.paymentsService.verifyAndConfirm(
      studentId,
      dto,
    );

    if (payment.status !== PaymentStatus.PAID) {
      throw new NotFoundException('Payment was not completed');
    }

    // Explicitly type this as Enrollment[]
    const enrollments: Enrollment[] = [];

    for (const item of payment.items) {
      if (item.referenceType !== 'course_enrollment') {
        continue;
      }

      const existing = await this.enrollmentRepo.findOne({
        where: {
          studentId,
          courseId: item.referenceId,
        },
      });

      if (existing) {
        enrollments.push(existing);
        continue;
      }

      const enrollment = this.enrollmentRepo.create({
        studentId,
        courseId: item.referenceId,
      });

      const savedEnrollment =
        await this.enrollmentRepo.save(enrollment);

      enrollments.push(savedEnrollment);
    }

    return {
      enrollments,
    };
  }

  /**
   * Returns all enrollments for the logged-in student.
   */
  findMyEnrollments(studentId: string) {
    return this.enrollmentRepo.find({
      where: { studentId },
      order: { enrolledAt: 'DESC' },
      relations: { course: true },
    });
  }

  /**
   * Checks whether a student is already enrolled in a course.
   */
  async isEnrolled(
    studentId: string,
    courseId: string,
  ): Promise<boolean> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: {
        studentId,
        courseId,
      },
    });

    return !!enrollment;
  }
}