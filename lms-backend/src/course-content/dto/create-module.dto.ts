import { IsString, IsOptional, IsInt, MinLength } from 'class-validator'; // validation decorators
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // Swagger docs decorators

export class CreateModuleDto {
  @ApiProperty({ example: 'Getting Started' }) // example shown in Swagger
  @IsString()
  @MinLength(3) // prevents near-empty titles
  title!: string;

  @ApiPropertyOptional({ example: 1 }) // optional field — shown differently in Swagger docs
  @IsOptional() // allows this field to be omitted entirely
  @IsInt()
  order?: number; // if omitted, defaults to 0 on the entity
}