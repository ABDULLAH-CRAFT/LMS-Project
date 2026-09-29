import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminRefundDto } from './dto/admin-refund.dto';
import { RefundService } from './refund.service';

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('admin/finance/refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class RefundController {
  constructor(private refundService: RefundService) {}

  @Post()
  @ApiOperation({ summary: 'Refund (fully or partially) one course in a paid order (admin only)' })
  create(@Req() req: any, @Body() dto: AdminRefundDto) {
    return this.refundService.adminRefund(req.user.userId, dto);
  }
}
