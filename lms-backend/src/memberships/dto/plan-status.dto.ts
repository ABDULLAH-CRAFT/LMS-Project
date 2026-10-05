import { IsEnum } from 'class-validator';
import { MembershipPlanStatus } from '../memberships.enums';

export class PlanStatusDto {
  @IsEnum(MembershipPlanStatus)
  status!: MembershipPlanStatus;
}