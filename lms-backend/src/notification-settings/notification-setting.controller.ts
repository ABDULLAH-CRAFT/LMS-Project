import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { NotificationSettingsService } from './notification-settings.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

@ApiTags('Notification Settings')
@Controller('notification-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class NotificationSettingsController {
  constructor(private service: NotificationSettingsService) {}

  @Get()
  @ApiOperation({ summary: "Get the logged-in student's notification settings" })
  get(@Req() req: any) {
    return this.service.getForStudent(req.user.userId);
  }

  @Patch()
  @ApiOperation({ summary: "Update the logged-in student's notification settings" })
  update(@Req() req: any, @Body() dto: UpdateNotificationSettingsDto) {
    return this.service.update(req.user.userId, dto);
  }
}