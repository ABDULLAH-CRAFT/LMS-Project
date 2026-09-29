import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { LessonProgress } from '../progress/entities/lesson-progress.entity';
import { Lesson } from '../course-content/entities/lesson.entity';
import { CourseModule as CourseModuleEntity } from '../course-content/entities/course-module.entity';
import { PaymentItem } from '../payment/entities/payment-item.entity';
import { PaymentStatus } from '../payment/entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { CoursesService } from '../courses/courses.service';

const round2 = (n: number) => Math.round(n * 100) / 100;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

@Injectable()
export class TeacherInsightsService {
  constructor(
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(LessonProgress) private progressRepo: Repository<LessonProgress>,
    @InjectRepository(Lesson) private lessonRepo: Repository<Lesson>,
    @InjectRepository(PaymentItem) private paymentItemRepo: Repository<PaymentItem>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private coursesService: CoursesService,
  ) {}

  // ───────────── per-course student list with progress ─────────────

  async getCourseStudents(teacherId: string, courseId: string) {
    const course = await this.coursesService.findOne(courseId); // 404 if missing
    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this course');
    }

    const totalLessons = await this.lessonRepo
      .createQueryBuilder('lesson')
      .innerJoin(CourseModuleEntity, 'module', 'module.id = lesson.moduleId')
      .where('module.courseId = :courseId', { courseId })
      .getCount();

    // Only name/email are selected, so passwordHash can never leak.
    const enrolled = await this.enrollmentRepo
      .createQueryBuilder('e')
      .innerJoin(User, 'u', 'u.id = e.studentId')
      .select('e.studentId', 'studentId')
      .addSelect('u.name', 'name')
      .addSelect('u.email', 'email')
      .addSelect('e.enrolledAt', 'enrolledAt')
      .where('e.courseId = :courseId', { courseId })
      .orderBy('e.enrolledAt', 'DESC')
      .getRawMany<{ studentId: string; name: string; email: string; enrolledAt: Date }>();

    const progressRows = await this.progressRepo
      .createQueryBuilder('p')
      .select('p.studentId', 'studentId')
      .addSelect('COUNT(*)', 'completed')
      .addSelect('MAX(p.completedAt)', 'lastActivityAt')
      .where('p.courseId = :courseId', { courseId })
      .groupBy('p.studentId')
      .getRawMany<{ studentId: string; completed: string; lastActivityAt: Date | null }>();

    const progressByStudent = new Map(progressRows.map((r) => [r.studentId, r]));

    const students = enrolled.map((row) => {
      const progress = progressByStudent.get(row.studentId);
      const completedCount = Math.min(Number(progress?.completed ?? 0), totalLessons); // cap in case lessons were deleted later
      const percent = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;
      return {
        studentId: row.studentId,
        name: row.name,
        email: row.email,
        enrolledAt: row.enrolledAt,
        completedCount,
        percent,
        lastActivityAt: progress?.lastActivityAt ?? null,
      };
    });

    const averageProgress =
      students.length > 0 ? Math.round(students.reduce((sum, s) => sum + s.percent, 0) / students.length) : 0;

    return {
      course: { id: course.id, title: course.title },
      totalLessons,
      summary: {
        enrolledCount: students.length,
        averageProgress,
        completedStudents: students.filter((s) => totalLessons > 0 && s.percent >= 100).length,
      },
      students,
    };
  }

  // ───────────── earnings / sales ─────────────

  async getEarnings(teacherId: string) {
    const courses = await this.courseRepo.find({ where: { teacherId }, select: { id: true, title: true } });

    // Last 6 months, pre-filled with zeros so the chart always has 6 bars.
    const now = new Date();
    const monthly = new Map<string, { revenue: number; sales: number }>();
    for (let i = 5; i >= 0; i--) {
      monthly.set(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)), { revenue: 0, sales: 0 });
    }

    const byCourse = new Map(
      courses.map((c) => [c.id, { courseId: c.id, title: c.title, salesCount: 0, revenue: 0 }]),
    );

    let items: PaymentItem[] = [];
    if (courses.length > 0) {
      items = await this.paymentItemRepo
        .createQueryBuilder('item')
        .innerJoinAndSelect('item.payment', 'payment')
        .where('item.referenceType = :type', { type: 'course_enrollment' })
        .andWhere('item.referenceId IN (:...courseIds)', { courseIds: courses.map((c) => c.id) })
        .andWhere('payment.status = :paid', { paid: PaymentStatus.PAID }) // only money actually received
        .orderBy('payment.updatedAt', 'DESC') // updatedAt is when the payment flipped to PAID
        .getMany();
    }

    const userIds = [...new Set(items.map((i) => i.payment.userId))];
    const users =
      userIds.length > 0
        ? await this.userRepo.find({ where: { id: In(userIds) }, select: { id: true, name: true, email: true } })
        : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const titleById = new Map(courses.map((c) => [c.id, c.title]));

    let revenue = 0;
    for (const item of items) {
      const amount = Number(item.amount) * (item.quantity || 1);
      revenue += amount;

      const courseRow = byCourse.get(item.referenceId);
      if (courseRow) {
        courseRow.salesCount += 1;
        courseRow.revenue += amount;
      }

      const bucket = monthly.get(monthKey(new Date(item.payment.updatedAt)));
      if (bucket) {
        bucket.revenue += amount;
        bucket.sales += 1;
      }
    }

    const salesCount = items.length;

    return {
      currency: 'INR',
      totals: {
        revenue: round2(revenue),
        salesCount,
        thisMonthRevenue: round2(monthly.get(monthKey(now))?.revenue ?? 0),
        averageOrderValue: salesCount > 0 ? round2(revenue / salesCount) : 0,
      },
      monthly: [...monthly.entries()].map(([month, v]) => ({
        month,
        revenue: round2(v.revenue),
        sales: v.sales,
      })),
      byCourse: [...byCourse.values()]
        .map((c) => ({ ...c, revenue: round2(c.revenue) }))
        .sort((a, b) => b.revenue - a.revenue),
      recentSales: items.slice(0, 15).map((item) => {
        const student = userById.get(item.payment.userId);
        return {
          id: item.id,
          courseTitle: titleById.get(item.referenceId) ?? 'Course',
          studentName: student?.name ?? 'Unknown student',
          studentEmail: student?.email ?? '',
          amount: round2(Number(item.amount) * (item.quantity || 1)),
          paidAt: item.payment.updatedAt,
        };
      }),
    };
  }
}