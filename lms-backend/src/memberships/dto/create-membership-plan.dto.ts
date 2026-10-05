import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MembershipBillingPeriod } from '../memberships.enums';

// Positive amount, up to 8 digits and 2 decimals. Sent as a STRING so no float ever touches money.
export const PRICE_PATTERN = /^(?!0+(\.0+)?$)\d{1,8}(\.\d{1,2})?$/;

export class CreateMembershipPlanDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @Matches(PRICE_PATTERN, { message: 'price must be a positive amount with at most 2 decimals, e.g. "599.00"' })
  price!: string;

  @IsOptional()
  @IsEnum(MembershipBillingPeriod)
  billingPeriod?: MembershipBillingPeriod;

  @IsOptional()
  @IsBoolean()
  includesAllCourses?: boolean;
}