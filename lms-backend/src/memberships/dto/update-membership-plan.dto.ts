import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MembershipBillingPeriod } from '../memberships.enums';
import { PRICE_PATTERN } from './create-membership-plan.dto';

export class UpdateMembershipPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // A new price only affects FUTURE purchases. Past payments keep the amount stored on their PaymentItem.
  @IsOptional()
  @IsString()
  @Matches(PRICE_PATTERN, { message: 'price must be a positive amount with at most 2 decimals, e.g. "599.00"' })
  price?: string;

  @IsOptional()
  @IsEnum(MembershipBillingPeriod)
  billingPeriod?: MembershipBillingPeriod;

  @IsOptional()
  @IsBoolean()
  includesAllCourses?: boolean;
}