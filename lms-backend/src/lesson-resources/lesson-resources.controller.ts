import {
  Controller,
  Post,
  Get,
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
import { LessonResourcesService, DOCUMENTS_DIR } from './lesson-resources.service';
import { CreateLessonResourceDto } from './dto/create-lesson-resource.dto';

fs.mkdirSync(DOCUMENTS_DIR, { recursive: true }); // multer's diskStorage needs the folder to exist

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const documentUpload = FileInterceptor('file', {
  storage: diskStorage({
    destination: DOCUMENTS_DIR,
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

@ApiTags('Lesson Resources')
@Controller('courses/:courseId')
export class LessonResourcesController {
  constructor(private resourcesService: LessonResourcesService) {}

  @Post('lessons/:lessonId/resources') // POST /courses/:courseId/lessons/:lessonId/resources
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload lecture notes to a lesson (owning teacher only)' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @UseInterceptors(documentUpload)
  create(
    @Req() req: Request & { user: { userId: string } },
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateLessonResourceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded (send it in a field named "file")');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.resourcesService.create(req.user.userId, courseId, lessonId, dto, file, baseUrl);
  }

  @Get('resources') // GET /courses/:courseId/resources
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all lecture notes in a course (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  findAll(@Req() req: Request & { user: { userId: string } }, @Param('courseId') courseId: string) {
    return this.resourcesService.findAllForCourse(req.user.userId, courseId);
  }

  @Delete('resources/:resourceId') // DELETE /courses/:courseId/resources/:resourceId
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a lecture note (owning teacher only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  remove(
    @Req() req: Request & { user: { userId: string } },
    @Param('courseId') courseId: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.resourcesService.remove(req.user.userId, courseId, resourceId);
  }
}