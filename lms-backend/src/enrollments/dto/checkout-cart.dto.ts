import { IsArray, IsUUID, ArrayNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutCartDto {
  @ApiProperty({
    example: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
    required: false,
    description:
      'Optional — pass specific course IDs for a direct "Buy now" purchase. Omit it to check out everything currently saved in the student\'s cart.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  courseIds?: string[];
}