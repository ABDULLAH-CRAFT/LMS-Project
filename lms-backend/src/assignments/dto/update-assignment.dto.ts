import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Multipart again — everything is a string. Every field is optional on update.
export class UpdateAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'ISO date string. Send an empty string to remove the deadline.' })
  @IsOptional()
  @ValidateIf((o: UpdateAssignmentDto) => o.dueDate !== '') // '' is allowed and means "clear the due date"
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  maxMarks?: number;

  @ApiPropertyOptional({ description: 'Send "true" to delete the current attachment (ignored if a new file is uploaded).' })
  @IsOptional()
  @IsIn(['true', 'false'])
  removeAttachment?: string;
}