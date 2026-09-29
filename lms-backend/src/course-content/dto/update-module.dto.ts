import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateModuleDto {
  @ApiProperty({ example: 'Getting Started (Updated)' })
  @IsString()
  @MinLength(3)
  title!: string;
}