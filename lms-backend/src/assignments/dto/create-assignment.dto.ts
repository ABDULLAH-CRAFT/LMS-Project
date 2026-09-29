import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// NOTE: this endpoint is multipart/form-data, so every field arrives as a string.
// @Type(() => Number) lets class-validator treat maxMarks as a number while validating;
// the service converts it with Number() before saving.
export class CreateAssignmentDto {
  @ApiProperty({ example: 'Week 1 problem set' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @ApiProperty({ example: 'Solve questions 1-10 from the attached paper.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional({ example: '2026-10-15T18:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  maxMarks?: number;
}