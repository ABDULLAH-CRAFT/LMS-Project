import { IsString, MinLength } from 'class-validator'; // validation decorators
import { ApiProperty } from '@nestjs/swagger'; // Swagger docs decorator

export class UpdateProfileDto {
  @ApiProperty({ example: 'Jane Doe' }) // example shown in Swagger
  @IsString()
  @MinLength(2) // prevents near-empty names
  name!: string; // only name is editable here — email changes are a bigger flow (verification etc.) left out of scope for now
}