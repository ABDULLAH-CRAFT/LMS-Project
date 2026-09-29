import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeSubmissionDto {
  @ApiProperty({ example: 85, description: 'Marks awarded. The service also checks it is not above the assignment max.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  grade!: number;

  @ApiPropertyOptional({ example: 'Good work, but show your steps in Q3.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}