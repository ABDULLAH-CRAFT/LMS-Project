import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import * as fs from 'fs';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SubmissionsService, SUBMISSIONS_DIR } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true }); // multer's diskStorage needs the folder to exist

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip', '.png', '.jpg', '.jpeg'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const submissionUpload = FileInterceptor('file', {
  storage: diskStorage({
    destination: SUBMISSIONS_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = ALLOWED_EXTENSIONS.includes(extname(file.originalname).toLowerCase());
    if (!allowed) {
      return cb(new BadRequestException(`Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`), false);
    }
    cb(null, true);
  },
});

type AuthedRequest = Request & { user: { userId: string } };

@ApiTags('Submissions')
@Controller()
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  // ───────────── student ─────────────

  @Post('courses/:courseId/assignments/:assignmentId/submissions') // POST /courses/:courseId/assignments/:assignmentId/submissions
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit (or resubmit, until graded) work for an assignment (enrolled student only)' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @UseInterceptors(submissionUpload)
  submit(
    @Req() req: AuthedRequest,
    @Param('courseId') courseId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CreateSubmissionDto,
    @UploadedFile() file?: Express.Multer.File, // optional — a written answer alone is fine
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.submissionsService.submit(req.user.userId, courseId, assignmentId, dto, file, baseUrl);
  }

  @Get('student/assignments') // GET /student/assignments
  @ApiBearerAuth()
  @ApiOperation({ summary: "All assignments in the student's enrolled courses, with their own submission" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  listMine(@Req() req: AuthedRequest) {
    return this.submissionsService.listForStudent(req.user.userId);
  }

  // ───────────── teacher ─────────────

  @Get('courses/:courseId/submissions/summary') // GET /courses/:courseId/submissions/summary
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submitted/graded counts per assignment in a course (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  summary(@Req() req: AuthedRequest, @Param('courseId') courseId: string) {
    return this.submissionsService.summaryForCourse(req.user.userId, courseId);
  }

  @Get('courses/:courseId/assignments/:assignmentId/submissions') // GET /courses/:courseId/assignments/:assignmentId/submissions
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List every submission for an assignment (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  listForAssignment(
    @Req() req: AuthedRequest,
    @Param('courseId') courseId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.submissionsService.listForAssignment(req.user.userId, courseId, assignmentId);
  }

  @Patch('courses/:courseId/submissions/:submissionId/grade') // PATCH /courses/:courseId/submissions/:submissionId/grade
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Grade a submission and leave feedback (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  grade(
    @Req() req: AuthedRequest,
    @Param('courseId') courseId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.submissionsService.grade(req.user.userId, courseId, submissionId, dto);
  }
}