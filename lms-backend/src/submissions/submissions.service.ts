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
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Lesson } from '../course-content/entities/lesson.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { User } from '../users/entities/user.entity';
import { CoursesService } from '../courses/courses.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { MembershipAccessService } from '../memberships/membership-access.service'; // R6
import { EngagementService } from '../engagement/engagement.service'; // R8
import { LearningEventType } from '../engagement/engagement.enums'; // R8

// Served by main.ts's existing /uploads/ static route — nothing to change there.
export const SUBMISSIONS_DIR = join(__dirname, '..', '..', 'uploads', 'submissions');

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(AssignmentSubmission) private submissionRepo: Repository<AssignmentSubmission>,
    @InjectRepository(Assignment) private assignmentRepo: Repository<Assignment>,
    @InjectRepository(Lesson) private lessonRepo: Repository<Lesson>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private coursesService: CoursesService,
    private membershipAccess: MembershipAccessService, // R6
    private engagement: EngagementService, // R8
  ) {}

  private async verifyOwnership(courseId: string, teacherId: string) {
    const course = await this.coursesService.findOne(courseId); // 404 if the course doesn't exist
    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this course');
    }
    return course;
  }

  private async requireEnrollment(studentId: string, courseId: string) {
    const access = await this.membershipAccess.getCourseAccess(studentId, courseId); // R6: purchase OR membership
    if (!access.hasAccess) throw new ForbiddenException('You do not have access to this course');
  }

  private removeFileFromDisk(storedName: string | null | undefined) {
    if (!storedName) return;
    fs.unlink(join(SUBMISSIONS_DIR, storedName), () => undefined); // best effort — a missing file must never break the request
  }

  // ───────────────────────── student side ─────────────────────────

  async submit(
    studentId: string,
    courseId: string,
    assignmentId: string,
    dto: CreateSubmissionDto,
    file: Express.Multer.File | undefined,
    baseUrl: string,
  ) {
    try {
      await this.requireEnrollment(studentId, courseId);

      const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId, courseId } });
      if (!assignment) throw new NotFoundException('Assignment not found');

      const text = dto.textAnswer?.trim() || null;
      if (!text && !file) {
        throw new BadRequestException('Write an answer or attach a file before submitting');
      }

      let submission = await this.submissionRepo.findOne({ where: { assignmentId, studentId } });
      if (submission?.gradedAt) {
        throw new ConflictException('This submission has already been graded and can no longer be changed');
      }

      const oldStoredName = submission?.fileStoredName ?? null;
      const now = new Date();

      if (!submission) {
        submission = this.submissionRepo.create({ assignmentId, courseId, studentId });
      }

      submission.textAnswer = text;
      submission.submittedAt = now;
      submission.isLate = assignment.dueDate ? now > assignment.dueDate : false; // late work is accepted but flagged

      if (file) {
        // a new file replaces the old one; with no new file, a resubmission keeps the previous file
        submission.fileUrl = `${baseUrl}/uploads/submissions/${file.filename}`;
        submission.fileName = file.originalname;
        submission.fileStoredName = file.filename;
      }

      const saved = await this.submissionRepo.save(submission);
      
      // R8: one ASSIGNMENT_SUBMITTED event per student per assignment - resubmitting never earns again.
      await this.engagement.track({
        studentId,
        courseId,
        lessonId: assignment.lessonId,
        eventType: LearningEventType.ASSIGNMENT_SUBMITTED,
        dedupeScope: assignmentId,
        metadata: { assignmentId, isLate: submission.isLate },
      });

      if (file && oldStoredName) this.removeFileFromDisk(oldStoredName); // only after the DB save succeeded
      return this.toStudentSubmission(saved);
    } catch (error) {
      this.removeFileFromDisk(file?.filename); // the upload already hit the disk before validation — clean it up
      throw error;
    }
  }

  // Every assignment across the courses this student is enrolled in, each with the student's own submission (or null).
  async listForStudent(studentId: string) {
    const enrollments = await this.enrollmentRepo.find({ where: { studentId } }); // course is eager-loaded
    if (enrollments.length === 0) return [];

    const courseTitleById = new Map(enrollments.map((e) => [e.courseId, e.course?.title ?? 'Course']));
    const courseIds = [...courseTitleById.keys()];

    const assignments = await this.assignmentRepo.find({
      where: { courseId: In(courseIds) },
      order: { dueDate: 'ASC', createdAt: 'ASC' }, // Postgres puts "no deadline" rows last
    });
    if (assignments.length === 0) return [];

    const lessons = await this.lessonRepo.find({ where: { id: In([...new Set(assignments.map((a) => a.lessonId))]) } });
    const lessonTitleById = new Map(lessons.map((l) => [l.id, l.title]));

    const submissions = await this.submissionRepo.find({
      where: { studentId, assignmentId: In(assignments.map((a) => a.id)) },
    });
    const submissionByAssignment = new Map(submissions.map((s) => [s.assignmentId, s]));

    return assignments.map((a) => {
      const submission = submissionByAssignment.get(a.id);
      return {
        id: a.id,
        courseId: a.courseId,
        lessonId: a.lessonId,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        maxMarks: a.maxMarks,
        attachmentUrl: a.attachmentUrl,
        attachmentName: a.attachmentName,
        courseTitle: courseTitleById.get(a.courseId) ?? 'Course',
        lessonTitle: lessonTitleById.get(a.lessonId) ?? '',
        submission: submission ? this.toStudentSubmission(submission) : null,
      };
    });
  }

  private toStudentSubmission(s: AssignmentSubmission) {
    return {
      id: s.id,
      assignmentId: s.assignmentId,
      courseId: s.courseId,
      studentId: s.studentId,
      textAnswer: s.textAnswer,
      fileUrl: s.fileUrl,
      fileName: s.fileName,
      submittedAt: s.submittedAt,
      isLate: s.isLate,
      grade: s.grade,
      feedback: s.feedback,
      gradedAt: s.gradedAt,
    };
  }

  // ───────────────────────── teacher side ─────────────────────────

  // Submitted/graded counts per assignment, for the course's assignment list.
  async summaryForCourse(teacherId: string, courseId: string) {
    await this.verifyOwnership(courseId, teacherId);

    const rows = await this.submissionRepo
      .createQueryBuilder('s')
      .select('s.assignmentId', 'assignmentId')
      .addSelect('COUNT(*)', 'submitted')
      .addSelect('COUNT(s.gradedAt)', 'graded') // COUNT(column) skips NULLs, so this counts graded rows only
      .where('s.courseId = :courseId', { courseId })
      .groupBy('s.assignmentId')
      .getRawMany<{ assignmentId: string; submitted: string; graded: string }>();

    const enrolledCount = await this.enrollmentRepo.count({ where: { courseId } });

    return {
      enrolledCount,
      assignments: rows.map((r) => ({
        assignmentId: r.assignmentId,
        submittedCount: Number(r.submitted),
        gradedCount: Number(r.graded),
      })),
    };
  }

  async listForAssignment(teacherId: string, courseId: string, assignmentId: string) {
    await this.verifyOwnership(courseId, teacherId);

    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId, courseId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const submissions = await this.submissionRepo.find({ where: { assignmentId }, order: { submittedAt: 'ASC' } });

    const studentIds = [...new Set(submissions.map((s) => s.studentId))];
    const students =
      studentIds.length > 0
        ? await this.userRepo.find({ where: { id: In(studentIds) }, select: { id: true, name: true, email: true } }) // never select passwordHash
        : [];
    const studentById = new Map(students.map((u) => [u.id, { id: u.id, name: u.name, email: u.email }]));

    const enrolledCount = await this.enrollmentRepo.count({ where: { courseId } });

    return {
      assignment,
      enrolledCount,
      submissions: submissions.map((s) => ({ ...s, student: studentById.get(s.studentId) ?? null })),
    };
  }

  async grade(teacherId: string, courseId: string, submissionId: string, dto: GradeSubmissionDto) {
    await this.verifyOwnership(courseId, teacherId);

    const submission = await this.submissionRepo.findOne({ where: { id: submissionId, courseId } });
    if (!submission) throw new NotFoundException('Submission not found');

    const assignment = await this.assignmentRepo.findOne({ where: { id: submission.assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    if (dto.grade > assignment.maxMarks) {
      throw new BadRequestException(`Grade cannot be more than the maximum of ${assignment.maxMarks} marks`);
    }

    submission.grade = dto.grade;
    submission.feedback = dto.feedback?.trim() || null;
    submission.gradedAt = new Date();
    submission.gradedById = teacherId;
    return this.submissionRepo.save(submission); // regrading is allowed — it just overwrites
  }
}