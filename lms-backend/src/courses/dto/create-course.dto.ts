import { IsString, IsNumber, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ example: 'Intro to React' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({ example: 'Learn the basics of React from scratch, including hooks and state.' })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiProperty({ example: 29.99 })
  @IsNumber()
  @Min(0)
  price!: number;
}