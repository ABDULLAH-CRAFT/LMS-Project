import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // NEW — describes each field for the docs UI

export class RegisterDto {
  @ApiProperty({ example: 'student@example.com' }) // shows this as the placeholder/example in Swagger's "Try it out" form
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name!: string;
}