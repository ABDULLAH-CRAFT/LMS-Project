import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LessonContentType } from '../entities/lesson.entity';

// Every field is optional — send only what changed.
export class UpdateLessonDto {
  @ApiPropertyOptional({ example: 'Introduction to Variables (v2)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({ enum: LessonContentType })
  @IsOptional()
  @IsEnum(LessonContentType)
  contentType?: LessonContentType;

  @ApiPropertyOptional({ example: 'Updated lesson text, or a new video URL' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;
}