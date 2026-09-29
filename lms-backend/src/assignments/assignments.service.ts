import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { join } from 'path';
import { Assignment } from './entities/assignment.entity';
import { Lesson } from '../course-content/entities/lesson.entity';
import { CourseModule } from '../course-content/entities/course-module.entity';
import { CoursesService } from '../courses/courses.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

// Served by main.ts's existing /uploads/ static route — nothing to change there.
export const ASSIGNMENTS_DIR = join(__dirname, '..', '..', 'uploads', 'assignments');

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment) private assignmentRepo: Repository<Assignment>,
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

  private removeFileFromDisk(storedName: string | null | undefined) {
    if (!storedName) return;
    fs.unlink(join(ASSIGNMENTS_DIR, storedName), () => undefined); // best effort — a missing file must never break the request
  }

  async create(
    teacherId: string,
    courseId: string,
    lessonId: string,
    dto: CreateAssignmentDto,
    file: Express.Multer.File | undefined,
    baseUrl: string,
  ) {
    try {
      await this.verifyOwnership(courseId, teacherId);

      const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
      if (!lesson) throw new NotFoundException('Lesson not found');

      const module = await this.moduleRepo.findOne({ where: { id: lesson.moduleId, courseId } });
      if (!module) throw new NotFoundException('Lesson not found in this course');

      const assignment = this.assignmentRepo.create({
        courseId,
        lessonId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        maxMarks: dto.maxMarks !== undefined ? Number(dto.maxMarks) : 100, // multipart sends strings
        attachmentUrl: file ? `${baseUrl}/uploads/assignments/${file.filename}` : null,
        attachmentName: file ? file.originalname : null,
        attachmentStoredName: file ? file.filename : null,
      });
      return await this.assignmentRepo.save(assignment);
    } catch (error) {
      this.removeFileFromDisk(file?.filename); // the upload already hit the disk before we checked ownership — clean it up
      throw error;
    }
  }

  async findAllForCourse(teacherId: string, courseId: string) {
    await this.verifyOwnership(courseId, teacherId);
    return this.assignmentRepo.find({ where: { courseId }, order: { createdAt: 'ASC' } });
  }

  async update(
    teacherId: string,
    courseId: string,
    assignmentId: string,
    dto: UpdateAssignmentDto,
    file: Express.Multer.File | undefined,
    baseUrl: string,
  ) {
    try {
      await this.verifyOwnership(courseId, teacherId);

      const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId, courseId } });
      if (!assignment) throw new NotFoundException('Assignment not found');

      if (dto.title !== undefined) assignment.title = dto.title.trim();
      if (dto.description !== undefined) assignment.description = dto.description.trim();
      if (dto.maxMarks !== undefined) assignment.maxMarks = Number(dto.maxMarks);
      if (dto.dueDate !== undefined) assignment.dueDate = dto.dueDate === '' ? null : new Date(dto.dueDate);

      const oldStoredName = assignment.attachmentStoredName;

      if (file) {
        // a new file replaces the old one
        assignment.attachmentUrl = `${baseUrl}/uploads/assignments/${file.filename}`;
        assignment.attachmentName = file.originalname;
        assignment.attachmentStoredName = file.filename;
      } else if (dto.removeAttachment === 'true') {
        assignment.attachmentUrl = null;
        assignment.attachmentName = null;
        assignment.attachmentStoredName = null;
      }

      const saved = await this.assignmentRepo.save(assignment);

      if (oldStoredName && oldStoredName !== saved.attachmentStoredName) {
        this.removeFileFromDisk(oldStoredName); // only after the DB save succeeded
      }
      return saved;
    } catch (error) {
      this.removeFileFromDisk(file?.filename);
      throw error;
    }
  }

  async remove(teacherId: string, courseId: string, assignmentId: string) {
    await this.verifyOwnership(courseId, teacherId);

    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId, courseId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    await this.assignmentRepo.remove(assignment);
    this.removeFileFromDisk(assignment.attachmentStoredName);
    return { deleted: true };
  }
}