import { IsString, MinLength } from 'class-validator'; // validation decorators
import { ApiProperty } from '@nestjs/swagger'; // Swagger docs decorator

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123' }) // example in Swagger
  @IsString()
  currentPassword!: string; // must match what's already on file, checked in the service

  @ApiProperty({ example: 'newPassword456', minLength: 6 }) // example in Swagger
  @IsString()
  @MinLength(6) // same rule as registration
  newPassword!: string;
}