import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { join } from 'path';
import { LessonResource } from './entities/lesson-resource.entity';
import { Lesson } from '../course-content/entities/lesson.entity';
import { CourseModule } from '../course-content/entities/course-module.entity';
import { CoursesService } from '../courses/courses.service';
import { CreateLessonResourceDto } from './dto/create-lesson-resource.dto';

// Same folder main.ts already serves at /uploads/ — nothing to change there.
export const DOCUMENTS_DIR = join(__dirname, '..', '..', 'uploads', 'documents');

@Injectable()
export class LessonResourcesService {
  constructor(
    @InjectRepository(LessonResource) private resourceRepo: Repository<LessonResource>,
    @InjectRepository(Lesson) private lessonRepo: Repository<Lesson>,
    @InjectRepository(CourseModule) private moduleRepo: Repository<CourseModule>,
    private coursesService: CoursesService,
  ) {}

  private async verifyOwnership(courseId: string, teacherId: string) {
    const course = await this.coursesService.findOne(courseId); // 404 if the course doesn't exist
    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this course');
    }
    return course;
  }

  private removeFileFromDisk(storedName: string) {
    fs.unlink(join(DOCUMENTS_DIR, storedName), () => undefined); // best effort — a missing file must never break the request
  }

  async create(
    teacherId: string,
    courseId: string,
    lessonId: string,
    dto: CreateLessonResourceDto,
    file: Express.Multer.File,
    baseUrl: string,
  ) {
    try {
      await this.verifyOwnership(courseId, teacherId);

      const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
      if (!lesson) throw new NotFoundException('Lesson not found');

      const module = await this.moduleRepo.findOne({ where: { id: lesson.moduleId, courseId } });
      if (!module) throw new NotFoundException('Lesson not found in this course');

      const resource = this.resourceRepo.create({
        courseId,
        lessonId,
        title: dto.title?.trim() || file.originalname,
        fileName: file.originalname,
        storedName: file.filename,
        fileUrl: `${baseUrl}/uploads/documents/${file.filename}`,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });
      return await this.resourceRepo.save(resource);
    } catch (error) {
      this.removeFileFromDisk(file.filename); // the upload already hit the disk before we checked ownership — clean it up
      throw error;
    }
  }

  async findAllForCourse(teacherId: string, courseId: string) {
    await this.verifyOwnership(courseId, teacherId);
    return this.resourceRepo.find({ where: { courseId }, order: { createdAt: 'ASC' } });
  }

  async remove(teacherId: string, courseId: string, resourceId: string) {
    await this.verifyOwnership(courseId, teacherId);

    const resource = await this.resourceRepo.findOne({ where: { id: resourceId, courseId } });
    if (!resource) throw new NotFoundException('Resource not found');

    await this.resourceRepo.remove(resource);
    this.removeFileFromDisk(resource.storedName);
    return { deleted: true };
  }
}