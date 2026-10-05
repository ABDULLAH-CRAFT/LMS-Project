import { IsUUID } from 'class-validator';

// The ONLY thing the client chooses is which plan. Price, amount, student and teacher
// shares are all derived on the server.
export class CheckoutMembershipDto {
  @IsUUID('all')
  planId!: string;
}