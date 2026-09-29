import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { Course, CourseStatus } from 'src/entities/course.entity';
import { Enrollment } from 'src/enrollments/entities/enrollment.entity';
import { CourseModule as CourseModuleEntity } from 'src/course-content/entities/course-module.entity';
import { Lesson } from 'src/course-content/entities/lesson.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(CourseModuleEntity) private moduleRepo: Repository<CourseModuleEntity>,
    @InjectRepository(Lesson) private lessonRepo: Repository<Lesson>,
  ) {}

  async create(teacherId: string, dto: CreateCourseDto) { // teacherId comes from the JWT, never from the request body
    const course = this.courseRepo.create({ ...dto, teacherId });
    return this.courseRepo.save(course);
  }

  findPublished(search?: string) { // used by the student catalog — only ever returns published courses
    const trimmed = search?.trim();
    return this.courseRepo.find({
      where: {
        status: CourseStatus.PUBLISHED,
        ...(trimmed ? { title: ILike(`%${trimmed}%`) } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  findByTeacher(teacherId: string) { // includes drafts, since it's the teacher's own view
    return this.courseRepo.find({
      where: { teacherId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllWithTeacher() { // admin course list: every course, its teacher, and its enrolled-student count
    const courses = await this.courseRepo.find({
      relations: { teacher: true },
      order: { createdAt: 'DESC' },
    });

    if (courses.length === 0) return [];

    const courseIds = courses.map((c) => c.id);
    const enrollmentCounts = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .select('enrollment.courseId', 'courseId')
      .addSelect('COUNT(*)', 'count')
      .where('enrollment.courseId IN (:...courseIds)', { courseIds })
      .groupBy('enrollment.courseId')
      .getRawMany<{ courseId: string; count: string }>();

    const studentCountByCourse = new Map(enrollmentCounts.map((row) => [row.courseId, Number(row.count)]));

    return courses.map((course) => ({
      ...course,
      studentCount: studentCountByCourse.get(course.id) ?? 0,
    }));
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

  async update(id: string, teacherId: string, dto: UpdateCourseDto) {
    const course = await this.findOne(id);
    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this course');
    }

    // Only apply fields that were actually sent. coverImageUrl is checked
    // separately because an explicit `null` means "clear the cover image".
    if (dto.title !== undefined) course.title = dto.title;
    if (dto.description !== undefined) course.description = dto.description;
    if (dto.price !== undefined) course.price = dto.price;
    if (dto.coverImageUrl !== undefined) course.coverImageUrl = dto.coverImageUrl;

    return this.courseRepo.save(course);
  }

  async remove(id: string, teacherId: string) { // NEW — permanently deletes a DRAFT course and its modules/lessons, ownership-checked
    const course = await this.findOne(id);
    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this course');
    }
    if (course.status !== CourseStatus.DRAFT) {
      // published courses may have students/payments attached — never hard-delete those
      throw new ConflictException('Only draft courses can be deleted');
    }

    // Defensive: a draft shouldn't have enrollments, but if one somehow does,
    // refuse rather than orphan it.
    const enrollmentCount = await this.enrollmentRepo.count({ where: { courseId: id } });
    if (enrollmentCount > 0) {
      throw new ConflictException('This course has enrolled students and cannot be deleted');
    }

    // lessons -> modules -> course have no ON DELETE CASCADE, so they are
    // removed child-first inside one transaction. cart_items cascade on their own.
    await this.courseRepo.manager.transaction(async (em) => {
      const modules = await em.find(CourseModuleEntity, { where: { courseId: id }, select: { id: true } });
      const moduleIds = modules.map((m) => m.id);
      if (moduleIds.length > 0) {
        await em.delete(Lesson, { moduleId: In(moduleIds) });
        await em.delete(CourseModuleEntity, { courseId: id });
      }
      await em.delete(Course, { id });
    });

    return { message: `Deleted draft course "${course.title}"` };
  }

  async getTeacherOverview(teacherId: string) { // teacher dashboard data: their courses + per-course counts + totals
    const courses = await this.findByTeacher(teacherId);
    if (courses.length === 0) {
      return { courses: [], totals: { totalCourses: 0, totalStudents: 0, totalLessons: 0 } };
    }

    const courseIds = courses.map((c) => c.id);

    const enrollmentCounts = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .select('enrollment.courseId', 'courseId')
      .addSelect('COUNT(*)', 'count')
      .where('enrollment.courseId IN (:...courseIds)', { courseIds })
      .groupBy('enrollment.courseId')
      .getRawMany<{ courseId: string; count: string }>();

    // Lessons belong to a module, which belongs to a course, so count via a join.
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

    // Distinct students: one enrolled in 3 of this teacher's courses counts once.
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