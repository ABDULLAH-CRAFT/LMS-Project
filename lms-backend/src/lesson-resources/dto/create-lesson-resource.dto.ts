import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLessonResourceDto {
  @ApiPropertyOptional({ example: 'Week 1 slides' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string; // if empty, the file's original name is used
}