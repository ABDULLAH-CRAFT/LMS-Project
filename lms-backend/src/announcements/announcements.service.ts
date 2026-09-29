import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { CoursesService } from '../courses/courses.service';
import { CourseStatus } from '../entities/course.entity';
import { UserRole } from '../users/entities/user.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement) private announcementRepo: Repository<Announcement>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
    private coursesService: CoursesService,
  ) {}

  private async verifyOwnership(courseId: string, teacherId: string) {
    const course = await this.coursesService.findOne(courseId); // 404 if the course doesn't exist
    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this course');
    }
    return course;
  }

  async create(teacherId: string, courseId: string, dto: CreateAnnouncementDto) {
    const course = await this.verifyOwnership(courseId, teacherId);
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Publish the course before posting announcements');
    }

    const announcement = this.announcementRepo.create({
      courseId,
      teacherId,
      title: dto.title.trim(),
      message: dto.message.trim(),
    });
    return this.announcementRepo.save(announcement);
  }

  // Used by BOTH roles: the owning teacher, or a student enrolled in the course.
  async listForCourse(user: { userId: string; role: string }, courseId: string) {
    if (user.role === UserRole.TEACHER) {
      await this.verifyOwnership(courseId, user.userId);
    } else {
      const enrollment = await this.enrollmentRepo.findOne({ where: { studentId: user.userId, courseId } });
      if (!enrollment) throw new ForbiddenException('You are not enrolled in this course');
    }

    return this.announcementRepo.find({ where: { courseId }, order: { createdAt: 'DESC' } });
  }

  async remove(teacherId: string, courseId: string, announcementId: string) {
    await this.verifyOwnership(courseId, teacherId);

    const announcement = await this.announcementRepo.findOne({ where: { id: announcementId, courseId } });
    if (!announcement) throw new NotFoundException('Announcement not found');

    await this.announcementRepo.remove(announcement);
    return { message: 'Announcement deleted' };
  }

  // Student inbox: latest announcements across every course they are enrolled in.
  async listForStudent(studentId: string) {
    const enrollments = await this.enrollmentRepo.find({ where: { studentId } }); // course is eager-loaded
    if (enrollments.length === 0) return [];

    const titleByCourse = new Map(enrollments.map((e) => [e.courseId, e.course?.title ?? 'Course']));

    const announcements = await this.announcementRepo.find({
      where: { courseId: In([...titleByCourse.keys()]) },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return announcements.map((a) => ({
      id: a.id,
      courseId: a.courseId,
      courseTitle: titleByCourse.get(a.courseId) ?? 'Course',
      title: a.title,
      message: a.message,
      createdAt: a.createdAt,
    }));
  }
}