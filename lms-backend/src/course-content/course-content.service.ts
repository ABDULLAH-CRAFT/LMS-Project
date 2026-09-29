import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as fs from 'fs';
import { join } from 'path';
import { CourseModule } from './entities/course-module.entity';
import { Lesson } from './entities/lesson.entity';
import { LessonProgress } from '../progress/entities/lesson-progress.entity';
import { LessonResource } from '../lesson-resources/entities/lesson-resource.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { AssignmentSubmission } from '../submissions/entities/assignment-submission.entity';
import { DOCUMENTS_DIR } from '../lesson-resources/lesson-resources.service';
import { ASSIGNMENTS_DIR } from '../assignments/assignments.service';
import { SUBMISSIONS_DIR } from '../submissions/submissions.service';
import { CourseStatus } from '../entities/course.entity';
import { CoursesService } from '../courses/courses.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ReorderDto } from './dto/reorder.dto';

type DiskFile = { dir: string; name: string };

@Injectable()
export class CourseContentService {
  constructor(
    @InjectRepository(CourseModule) private moduleRepo: Repository<CourseModule>,
    @InjectRepository(Lesson) private lessonRepo: Repository<Lesson>,
    private coursesService: CoursesService,
  ) {}

  // ───────────────────────── helpers ─────────────────────────

  private async verifyOwnership(courseId: string, teacherId: string) {
    const course = await this.coursesService.findOne(courseId); // throws 404 if the course doesn't exist
    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this course');
    }
    return course;
  }

  private async findModuleInCourse(courseId: string, moduleId: string) {
    const module = await this.moduleRepo.findOne({ where: { id: moduleId, courseId } });
    if (!module) throw new NotFoundException('Module not found in this course');
    return module;
  }

  private async findLessonInCourse(courseId: string, lessonId: string) {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const module = await this.moduleRepo.findOne({ where: { id: lesson.moduleId, courseId } });
    if (!module) throw new NotFoundException('Lesson not found in this course');
    return lesson;
  }

  private async countCourseLessons(courseId: string): Promise<number> {
    const modules = await this.moduleRepo.find({ where: { courseId }, select: { id: true } });
    if (modules.length === 0) return 0;
    return this.lessonRepo.count({ where: { moduleId: In(modules.map((m) => m.id)) } });
  }

  // A published course must always keep at least one lesson (same rule as publishing itself).
  private async assertPublishedCourseKeepsALesson(courseStatus: CourseStatus, courseId: string, lessonsBeingRemoved: number) {
    if (courseStatus !== CourseStatus.PUBLISHED) return;
    const total = await this.countCourseLessons(courseId);
    if (total - lessonsBeingRemoved <= 0) {
      throw new ConflictException('A published course must keep at least one lesson');
    }
  }

  private assertSameIds(requested: string[], existing: string[]) {
    const unique = new Set(requested);
    const isExactMatch =
      unique.size === requested.length &&
      requested.length === existing.length &&
      existing.every((id) => unique.has(id));
    if (!isExactMatch) {
      throw new BadRequestException('The list must contain every item exactly once');
    }
  }

  // Everything uploaded to a lesson lives on disk too: lecture notes, assignment attachments, student submissions.
  private async collectDiskFiles(lessonIds: string[]): Promise<DiskFile[]> {
    if (lessonIds.length === 0) return [];
    const em = this.lessonRepo.manager;
    const files: DiskFile[] = [];

    const resources = await em.find(LessonResource, { where: { lessonId: In(lessonIds) } });
    resources.forEach((r) => files.push({ dir: DOCUMENTS_DIR, name: r.storedName }));

    const assignments = await em.find(Assignment, { where: { lessonId: In(lessonIds) } });
    assignments.forEach((a) => {
      if (a.attachmentStoredName) files.push({ dir: ASSIGNMENTS_DIR, name: a.attachmentStoredName });
    });

    if (assignments.length > 0) {
      const submissions = await em.find(AssignmentSubmission, {
        where: { assignmentId: In(assignments.map((a) => a.id)) },
      });
      submissions.forEach((s) => {
        if (s.fileStoredName) files.push({ dir: SUBMISSIONS_DIR, name: s.fileStoredName });
      });
    }
    return files;
  }

  private removeDiskFiles(files: DiskFile[]) {
    files.forEach((f) => fs.unlink(join(f.dir, f.name), () => undefined)); // best effort — never fail the request over a missing file
  }

  private async nextModuleOrder(courseId: string): Promise<number> {
    const last = await this.moduleRepo.findOne({ where: { courseId }, order: { order: 'DESC' } });
    return last ? last.order + 1 : 0;
  }

  private async nextLessonOrder(moduleId: string): Promise<number> {
    const last = await this.lessonRepo.findOne({ where: { moduleId }, order: { order: 'DESC' } });
    return last ? last.order + 1 : 0;
  }

  // ───────────────────────── create ─────────────────────────

  async createModule(teacherId: string, courseId: string, dto: CreateModuleDto) {
    await this.verifyOwnership(courseId, teacherId);
    const order = dto.order ?? (await this.nextModuleOrder(courseId)); // new modules go to the end unless told otherwise
    const module = this.moduleRepo.create({ ...dto, order, courseId });
    return this.moduleRepo.save(module);
  }

  async createLesson(teacherId: string, courseId: string, moduleId: string, dto: CreateLessonDto) {
    await this.verifyOwnership(courseId, teacherId);
    await this.findModuleInCourse(courseId, moduleId); // confirms the module belongs to THIS course

    const order = dto.order ?? (await this.nextLessonOrder(moduleId));
    const lesson = this.lessonRepo.create({ ...dto, order, moduleId });
    return this.lessonRepo.save(lesson);
  }

  // ───────────────────────── read ─────────────────────────

  async getCurriculum(courseId: string) {
    const modules = await this.moduleRepo.find({ where: { courseId }, order: { order: 'ASC' } });

    return Promise.all(
      modules.map(async (module) => {
        const lessons = await this.lessonRepo.find({ where: { moduleId: module.id }, order: { order: 'ASC' } });
        return { ...module, lessons };
      }),
    );
  }

  // ───────────────────────── modules: edit / delete / reorder ─────────────────────────

  async updateModule(teacherId: string, courseId: string, moduleId: string, dto: UpdateModuleDto) {
    await this.verifyOwnership(courseId, teacherId);
    const module = await this.findModuleInCourse(courseId, moduleId);
    module.title = dto.title.trim();
    return this.moduleRepo.save(module);
  }

  async deleteModule(teacherId: string, courseId: string, moduleId: string) {
    const course = await this.verifyOwnership(courseId, teacherId);
    await this.findModuleInCourse(courseId, moduleId);

    const lessons = await this.lessonRepo.find({ where: { moduleId }, select: { id: true } });
    const lessonIds = lessons.map((l) => l.id);

    await this.assertPublishedCourseKeepsALesson(course.status, courseId, lessonIds.length);
    const files = await this.collectDiskFiles(lessonIds);

    // Child-first, one transaction. Resources, assignments and submissions rows go via ON DELETE CASCADE.
    await this.moduleRepo.manager.transaction(async (em) => {
      if (lessonIds.length > 0) {
        await em.delete(LessonProgress, { lessonId: In(lessonIds) });
        await em.delete(Lesson, { id: In(lessonIds) });
      }
      await em.delete(CourseModule, { id: moduleId });
    });

    this.removeDiskFiles(files); // only after the DB commit succeeded
    return { deleted: true };
  }

  async reorderModules(teacherId: string, courseId: string, dto: ReorderDto) {
    await this.verifyOwnership(courseId, teacherId);

    const modules = await this.moduleRepo.find({ where: { courseId }, select: { id: true } });
    this.assertSameIds(dto.ids, modules.map((m) => m.id));

    await this.moduleRepo.manager.transaction(async (em) => {
      for (let index = 0; index < dto.ids.length; index++) {
        await em.update(CourseModule, { id: dto.ids[index] }, { order: index }); // renumbers 0..n-1, which also fixes old rows that all had order 0
      }
    });

    return this.getCurriculum(courseId);
  }

  // ───────────────────────── lessons: edit / delete / reorder ─────────────────────────

  async updateLesson(teacherId: string, courseId: string, lessonId: string, dto: UpdateLessonDto) {
    await this.verifyOwnership(courseId, teacherId);
    const lesson = await this.findLessonInCourse(courseId, lessonId);

    if (dto.contentType !== undefined && dto.contentType !== lesson.contentType && dto.content === undefined) {
      // e.g. text -> video with the old text still in `content` would leave a broken video lesson
      throw new BadRequestException('Provide new content when changing the lesson type');
    }

    if (dto.title !== undefined) lesson.title = dto.title.trim();
    if (dto.contentType !== undefined) lesson.contentType = dto.contentType;
    if (dto.content !== undefined) lesson.content = dto.content;

    if (!lesson.content.trim()) throw new BadRequestException('Lesson content cannot be empty');
    return this.lessonRepo.save(lesson);
  }

  async deleteLesson(teacherId: string, courseId: string, lessonId: string) {
    const course = await this.verifyOwnership(courseId, teacherId);
    await this.findLessonInCourse(courseId, lessonId);

    await this.assertPublishedCourseKeepsALesson(course.status, courseId, 1);
    const files = await this.collectDiskFiles([lessonId]);

    await this.lessonRepo.manager.transaction(async (em) => {
      await em.delete(LessonProgress, { lessonId }); // students' completion rows for this lesson
      await em.delete(Lesson, { id: lessonId }); // resources, assignments and submissions rows go via ON DELETE CASCADE
    });

    this.removeDiskFiles(files);
    return { deleted: true };
  }

  async reorderLessons(teacherId: string, courseId: string, moduleId: string, dto: ReorderDto) {
    await this.verifyOwnership(courseId, teacherId);
    await this.findModuleInCourse(courseId, moduleId);

    const lessons = await this.lessonRepo.find({ where: { moduleId }, select: { id: true } });
    this.assertSameIds(dto.ids, lessons.map((l) => l.id));

    await this.lessonRepo.manager.transaction(async (em) => {
      for (let index = 0; index < dto.ids.length; index++) {
        await em.update(Lesson, { id: dto.ids[index] }, { order: index });
      }
    });

    return this.getCurriculum(courseId);
  }
}