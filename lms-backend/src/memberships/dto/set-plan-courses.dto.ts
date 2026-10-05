import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class SetPlanCoursesDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  courseIds!: string[];

  @IsOptional()
  @IsBoolean()
  includesAllCourses?: boolean;
}