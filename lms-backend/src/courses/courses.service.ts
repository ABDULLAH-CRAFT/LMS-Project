// lms-backend/src/courses/courses.service.ts
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Course, CourseStatus } from 'src/entities/course.entity';
import { Enrollment } from 'src/enrollments/entities/enrollment.entity'; // NEW — for student counts
import { CourseModule as CourseModuleEntity } from 'src/course-content/entities/course-module.entity'; // NEW — for lesson counts (aliased — clashes with Nest's own @Module concept otherwise)
import { Lesson } from 'src/course-content/entities/lesson.entity'; // NEW — for lesson counts
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto'; // NEW

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>, // NEW — read-only here, just for counts
    @InjectRepository(CourseModuleEntity) private moduleRepo: Repository<CourseModuleEntity>, // NEW
    @InjectRepository(Lesson) private lessonRepo: Repository<Lesson>, // NEW
  ) {}

  async create(teacherId: string, dto: CreateCourseDto) {
    const course = this.courseRepo.create({ ...dto, teacherId });
    return this.courseRepo.save(course);
  }

  findPublished(search?: string) {
    const trimmed = search?.trim();
    return this.courseRepo.find({
      where: {
        status: CourseStatus.PUBLISHED,
        ...(trimmed ? { title: ILike(`%${trimmed}%`) } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  findByTeacher(teacherId: string) {
    return this.courseRepo.find({
      where: { teacherId },
      order: { createdAt: 'DESC' },
    });
  }

  findAllWithTeacher() {
    return this.courseRepo.find({
      relations: { teacher: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async publish(id: string, teacherId: string) {
    const course = await this.findOne(id);
    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this course');
    }
    course.status = CourseStatus.PUBLISHED;
    return this.courseRepo.save(course);
  }

  async update(id: string, teacherId: string, dto: UpdateCourseDto) { // NEW — edits title/description/price/cover image, ownership-checked
    const course = await this.findOne(id); // 404 if it doesn't exist at all
    if (course.teacherId !== teacherId) { // same ownership rule as publish() — teacher A can't edit teacher B's course
      throw new ForbiddenException('You do not own this course');
    }

    // Only apply fields that were actually sent — undefined means "leave as
    // is". coverImageUrl is the one exception: an explicit `null` is a real
    // instruction to clear the cover image, not "field omitted", so it's
    // checked separately rather than folded into the general spread.
    if (dto.title !== undefined) course.title = dto.title;
    if (dto.description !== undefined) course.description = dto.description;
    if (dto.price !== undefined) course.price = dto.price;
    if (dto.coverImageUrl !== undefined) course.coverImageUrl = dto.coverImageUrl;

    return this.courseRepo.save(course);
  }

  async getTeacherOverview(teacherId: string) { // NEW — teacher dashboard data: their courses + per-course counts + totals
    const courses = await this.findByTeacher(teacherId);
    if (courses.length === 0) {
      return { courses: [], totals: { totalCourses: 0, totalStudents: 0, totalLessons: 0 } };
    }

    const courseIds = courses.map((c) => c.id);

    // One grouped query for enrollment counts per course, instead of N
    // separate COUNT queries (one per course) inside a loop.
    const enrollmentCounts = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .select('enrollment.courseId', 'courseId')
      .addSelect('COUNT(*)', 'count')
      .where('enrollment.courseId IN (:...courseIds)', { courseIds })
      .groupBy('enrollment.courseId')
      .getRawMany<{ courseId: string; count: string }>();

    // Lessons don't store courseId directly — they belong to a module, which
    // belongs to a course — so this counts lessons via a join through
    // course_modules rather than a direct where clause.
    const lessonCounts = await this.lessonRepo
      .createQueryBuilder('lesson')
      .innerJoin(CourseModuleEntity, 'module', 'module.id = lesson.moduleId')
      .select('module.courseId', 'courseId')
      .addSelect('COUNT(*)', 'count')
      .where('module.courseId IN (:...courseIds)', { courseIds })
      .groupBy('module.courseId')
      .getRawMany<{ courseId: string; count: string }>();

    const studentCountByCourse = new Map(enrollmentCounts.map((row) => [row.courseId, Number(row.count)]));
    const lessonCountByCourse = new Map(lessonCounts.map((row) => [row.courseId, Number(row.count)]));

    const coursesWithCounts = courses.map((course) => ({
      ...course,
      studentCount: studentCountByCourse.get(course.id) ?? 0,
      lessonCount: lessonCountByCourse.get(course.id) ?? 0,
    }));

    // Distinct students, not summed enrollments — a student enrolled in 3 of
    // this teacher's courses should count once, not three times.
    const distinctStudents = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .select('DISTINCT enrollment.studentId', 'studentId')
      .where('enrollment.courseId IN (:...courseIds)', { courseIds })
      .getRawMany<{ studentId: string }>();

    const totalLessons = Array.from(lessonCountByCourse.values()).reduce((sum, n) => sum + n, 0);

    return {
      courses: coursesWithCounts,
      totals: {
        totalCourses: courses.length,
        totalStudents: distinctStudents.length,
        totalLessons,
      },
    };
  }
}