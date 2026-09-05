import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutCartDto {
  @ApiProperty({ example: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  courseIds!: string[];
}