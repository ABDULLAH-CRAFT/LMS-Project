// lms-backend/src/courses/dto/update-course.dto.ts
import { IsString, IsNumber, IsOptional, Min, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Every field is optional — the teacher can send just the one thing they're
// changing (e.g. only { price: 39.99 }) rather than the whole course object.
export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'Intro to React (Updated)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({ example: 'A refreshed description covering the new hooks module.' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @ApiPropertyOptional({ example: 34.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/covers/intro-react.png',
    description: 'Pass a URL to set/replace the cover image, or null to remove it.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;
}