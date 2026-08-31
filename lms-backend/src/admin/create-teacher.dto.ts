import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeacherDto {
  @ApiProperty({ example: 'teacher@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'John Smith' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'temp123456', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}