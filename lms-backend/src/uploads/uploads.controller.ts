// lms-backend/src/uploads/uploads.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB cap per video

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER) // only teachers upload lesson videos
export class UploadsController {
  @Post('video') // POST /uploads/video — multipart field name must be "video"
  @ApiOperation({ summary: 'Upload a lesson video file (teacher only). Returns the public URL.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { video: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', 'uploads', 'videos'),
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_VIDEO_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('video/')) {
          return cb(new BadRequestException('Only video files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadVideo(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('No video file received (field name must be "video")');

    const url = `${req.protocol}://${req.get('host')}/uploads/videos/${file.filename}`;
    return { url };
  }
}