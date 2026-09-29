import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
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
import { AssignmentsService, ASSIGNMENTS_DIR } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

fs.mkdirSync(ASSIGNMENTS_DIR, { recursive: true }); // multer's diskStorage needs the folder to exist

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const attachmentUpload = FileInterceptor('file', {
  storage: diskStorage({
    destination: ASSIGNMENTS_DIR,
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

type TeacherRequest = Request & { user: { userId: string } };

@ApiTags('Assignments')
@Controller('courses/:courseId')
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Post('lessons/:lessonId/assignments') // POST /courses/:courseId/lessons/:lessonId/assignments
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an assignment on a lesson, with an optional attachment (owning teacher only)' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @UseInterceptors(attachmentUpload)
  create(
    @Req() req: TeacherRequest,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateAssignmentDto,
    @UploadedFile() file?: Express.Multer.File, // optional — an assignment doesn't need an attachment
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.assignmentsService.create(req.user.userId, courseId, lessonId, dto, file, baseUrl);
  }

  @Get('assignments') // GET /courses/:courseId/assignments
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all assignments in a course (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  findAll(@Req() req: TeacherRequest, @Param('courseId') courseId: string) {
    return this.assignmentsService.findAllForCourse(req.user.userId, courseId);
  }

  @Patch('assignments/:assignmentId') // PATCH /courses/:courseId/assignments/:assignmentId
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit an assignment, optionally replacing or removing its attachment (owning teacher only)' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @UseInterceptors(attachmentUpload)
  update(
    @Req() req: TeacherRequest,
    @Param('courseId') courseId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.assignmentsService.update(req.user.userId, courseId, assignmentId, dto, file, baseUrl);
  }

  @Delete('assignments/:assignmentId') // DELETE /courses/:courseId/assignments/:assignmentId
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an assignment and its attachment (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  remove(
    @Req() req: TeacherRequest,
    @Param('courseId') courseId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentsService.remove(req.user.userId, courseId, assignmentId);
  }
}