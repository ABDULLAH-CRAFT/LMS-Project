import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Used for both module reordering and lesson reordering:
// the FULL list of ids, in the order they should appear.
export class ReorderDto {
  @ApiProperty({ type: [String], description: 'Every id in the list, in the new order' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  ids!: string[];
}