import { IsString, IsNumber, IsOptional, IsUrl, Min, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ example: 'http://localhost:3000/uploads/images/abc.jpg' }) // NEW — optional cover image, URL returned by POST /uploads/image
  @IsOptional()
  @IsUrl({ require_tld: false }) // require_tld:false so http://localhost:3000/... passes in development
  @MaxLength(500)
  coverImageUrl?: string;
}
