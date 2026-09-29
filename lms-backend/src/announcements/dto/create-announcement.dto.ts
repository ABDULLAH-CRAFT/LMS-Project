import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Class moved to Friday' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @ApiProperty({ example: 'Please read Module 2 before the next session.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string;
}