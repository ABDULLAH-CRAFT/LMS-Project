import { IsUUID } from 'class-validator'; // validates the field is a properly formatted UUID
import { ApiProperty } from '@nestjs/swagger'; // Swagger docs decorator

export class CreateEnrollmentDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }) // example shown in Swagger's "Try it out" form
  @IsUUID() // rejects anything that isn't a valid UUID format
  courseId!: string; // the course the student wants to enroll in
  // deliberately NO studentId field — that's always taken from the JWT, never trusted from the request body
}