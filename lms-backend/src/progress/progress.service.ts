import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { LessonProgress } from './entities/lesson-progress.entity';
import { Lesson } from '../course-content/entities/lesson.entity';
import { CourseModule } from '../course-content/entities/course-module.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

import { MembershipAccessService } from '../memberships/membership-access.service'; // R6
import { EngagementService } from '../engagement/engagement.service'; // R8
import { LearningEventType } from '../engagement/engagement.enums'; // R8

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(LessonProgress)
    private progressRepo: Repository<LessonProgress>,

    @InjectRepository(Lesson)
    private lessonRepo: Repository<Lesson>,

    @InjectRepository(CourseModule)
    private moduleRepo: Repository<CourseModule>,

    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,

    private membershipAccess: MembershipAccessService, // R6
    private engagement: EngagementService, // R8
  ) {}

  private async requireEnrollment(
    studentId: string,
    courseId: string,
  ) {
    // R6: direct purchase OR membership access
    const access = await this.membershipAccess.getCourseAccess(
      studentId,
      courseId,
    );

    if (!access.hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this course',
      );
    }
  }

  private async getLessonIdsForCourse(
    courseId: string,
  ): Promise<string[]> {
    const modules = await this.moduleRepo.find({
      where: { courseId },
    });

    if (modules.length === 0) {
      return [];
    }

    const lessons = await this.lessonRepo.find({
      where: {
        moduleId: In(modules.map((m) => m.id)),
      },
    });

    return lessons.map((l) => l.id);
  }

  // R8: the student opened a lesson. Records COURSE_STARTED (once per course) and LESSON_STARTED (once per lesson).
  async startLesson(studentId: string, lessonId: string) {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const module = await this.moduleRepo.findOne({ where: { id: lesson.moduleId } });
    if (!module) throw new NotFoundException('Module not found');

    await this.requireEnrollment(studentId, module.courseId);

    await this.engagement.track({
      studentId,
      courseId: module.courseId,
      eventType: LearningEventType.COURSE_STARTED,
      dedupeScope: module.courseId,
    });

    await this.engagement.track({
      studentId,
      courseId: module.courseId,
      lessonId,
      eventType: LearningEventType.LESSON_STARTED,
      dedupeScope: lessonId,
    });

    return { ok: true };
  }

  async completeLesson(
    studentId: string,
    lessonId: string,
  ) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const module = await this.moduleRepo.findOne({
      where: { id: lesson.moduleId },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    await this.requireEnrollment(
      studentId,
      module.courseId,
    );

    const existing = await this.progressRepo.findOne({
      where: {
        studentId,
        lessonId,
      },
    });

    // Prevent duplicate completion
    if (existing) {
      return existing;
    }

    const progress = this.progressRepo.create({
      studentId,
      lessonId,
      courseId: module.courseId,
    });

    const saved = await this.progressRepo.save(progress);

    // R8: engagement events. Best-effort - they can never make the completion itself fail.
    await this.trackCompletionEvents(studentId, module.courseId, lessonId);

    return saved;
  }

  // R8
  private async trackCompletionEvents(
    studentId: string,
    courseId: string,
    lessonId: string,
  ) {
    try {
      await this.engagement.track({
        studentId,
        courseId,
        lessonId,
        eventType: LearningEventType.LESSON_COMPLETED,
        dedupeScope: lessonId,
      });

      const lessonIds = await this.getLessonIdsForCourse(courseId);
      if (lessonIds.length === 0) return;

      const done = await this.progressRepo.count({
        where: { studentId, courseId, lessonId: In(lessonIds) },
      });

      if (done >= lessonIds.length) {
        await this.engagement.track({
          studentId,
          courseId,
          eventType: LearningEventType.COURSE_COMPLETED,
          dedupeScope: courseId,
          totalLessons: lessonIds.length,
        });
      }
    } catch {
      // swallowed on purpose - EngagementService.track already logs its own failures
    }
  }

  async getCourseProgress(
    studentId: string,
    courseId: string,
  ) {
    await this.requireEnrollment(studentId, courseId);

    const lessonIds =
      await this.getLessonIdsForCourse(courseId);

    const completed = await this.progressRepo.find({
      where: {
        studentId,
        courseId,
      },
    });

    const completedLessonIds = completed.map(
      (p) => p.lessonId,
    );

    return {
      completedLessonIds,
      totalLessons: lessonIds.length,
      completedCount: completedLessonIds.length,
      percent:
        lessonIds.length > 0
          ? Math.round(
              (completedLessonIds.length /
                lessonIds.length) *
                100,
            )
          : 0,
    };
  }

  async getMyStats(studentId: string) {
    const allProgress = await this.progressRepo.find({
      where: { studentId },
    });

    const lessonsCompleted = allProgress.length;

    const courseIds = [
      ...new Set(allProgress.map((p) => p.courseId)),
    ];

    let coursesCompleted = 0;

    for (const courseId of courseIds) {
      const totalLessonIds =
        await this.getLessonIdsForCourse(courseId);

      const completedForCourse = allProgress.filter(
        (p) => p.courseId === courseId,
      ).length;

      if (
        totalLessonIds.length > 0 &&
        completedForCourse >= totalLessonIds.length
      ) {
        coursesCompleted++;
      }
    }

    // Streak calculation
    const completedDates = new Set(
      allProgress.map((p) =>
        new Date(p.completedAt).toDateString(),
      ),
    );

    let streakDays = 0;
    const cursor = new Date();

    while (
      completedDates.has(cursor.toDateString())
    ) {
      streakDays++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // XP System
    const xp = lessonsCompleted * 50;
    const level = Math.floor(xp / 500) + 1;
    const currentLevelXp = xp % 500;
    const nextLevelXp = 500;

    return {
      streakDays,
      lessonsCompleted,
      coursesCompleted,
      xp,
      level,
      currentLevelXp,
      nextLevelXp,
    };
  }
}