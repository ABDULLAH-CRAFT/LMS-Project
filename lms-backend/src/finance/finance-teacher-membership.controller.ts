import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { FinanceTeacherMembershipService } from './finance-teacher-membership.service';

// TEACHER only, read-only. The teacher id comes from the JWT and NOWHERE else (no :teacherId in the URL, body or query).
@ApiTags('Teacher Finance')
@ApiBearerAuth()
@Controller('finance/teacher/membership')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class FinanceTeacherMembershipController {
  constructor(private readonly membership: FinanceTeacherMembershipService) {}

  @Get()
  @ApiOperation({ summary: "The logged-in teacher's monthly membership earnings with the engagement score breakdown" })
  list(@Req() req: any, @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit = 12) {
    const safeLimit = Math.min(Math.max(limit, 1), 36);
    return this.membership.getMembershipEarnings(req.user.userId, safeLimit);
  }
}