import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// multipart/form-data: the optional file travels in the "file" field, the text in "textAnswer".
export class CreateSubmissionDto {
  @ApiPropertyOptional({ example: 'My answers are in section 2 of the attached file.' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  textAnswer?: string;
}