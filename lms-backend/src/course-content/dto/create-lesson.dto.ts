import { IsString, IsEnum, IsOptional, IsInt, MinLength } from 'class-validator'; // validation decorators
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // Swagger docs decorators
import { LessonContentType } from '../entities/lesson.entity'; // enum for validation

export class CreateLessonDto {
  @ApiProperty({ example: 'Introduction to Variables' }) // example in Swagger
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({ enum: LessonContentType, example: LessonContentType.TEXT }) // shows the enum's allowed values in Swagger
  @IsEnum(LessonContentType) // rejects anything not in the enum
  contentType!: LessonContentType;

  @ApiProperty({ example: 'A variable stores a value you can reference later...' }) // example in Swagger
  @IsString()
  @MinLength(1) // must have SOME content
  content!: string; // either lesson text, or a video URL — depending on contentType

  @ApiPropertyOptional({ example: 1 }) // optional
  @IsOptional()
  @IsInt()
  order?: number;
}