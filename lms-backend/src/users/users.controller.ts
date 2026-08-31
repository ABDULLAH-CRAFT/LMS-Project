import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common'; // added Patch, Body
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto'; // NEW
import { ChangePasswordDto } from './dto/change-password.dto'; // NEW

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the logged-in user's own profile" })
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    const user = await this.usersService.findById(req.user.userId);
    const { passwordHash, ...safeUser } = user!;
    return safeUser;
  }

  @Patch('me') // NEW — PATCH /users/me
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the logged-in user's name" })
  @UseGuards(JwtAuthGuard)
  async updateMe(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const user = await this.usersService.updateName(req.user.userId, dto.name); // userId always from the token, never from the body
    const { passwordHash, ...safeUser } = user; // strip password hash before returning
    return safeUser;
  }

  @Patch('me/password') // NEW — PATCH /users/me/password
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change the logged-in user's password" })
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.updatePassword(req.user.userId, dto.currentPassword, dto.newPassword);
  }
}