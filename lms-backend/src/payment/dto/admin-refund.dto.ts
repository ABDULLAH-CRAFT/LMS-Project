import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class AdminRefundDto {
  @ApiProperty({ description: 'The payment item (one course in an order) to refund' })
  @IsUUID()
  paymentItemId!: string;

  @ApiPropertyOptional({ example: '400.00', description: 'Omit to refund everything still refundable for this item' })
  @IsOptional()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/, { message: 'amount must be a positive number with at most 2 decimals' })
  amount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
