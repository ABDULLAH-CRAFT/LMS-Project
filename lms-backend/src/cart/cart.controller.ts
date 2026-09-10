import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@ApiTags('Cart')
@Controller('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "Get the logged-in student's cart" })
  getCart(@Req() req: any) {
    return this.cartService.getCart(req.user.userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a course to the cart' })
  addItem(@Req() req: any, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(req.user.userId, dto.courseId);
  }

  @Delete('items/:courseId')
  @ApiOperation({ summary: 'Remove a single course from the cart' })
  removeItem(@Req() req: any, @Param('courseId') courseId: string) {
    return this.cartService.removeItem(req.user.userId, courseId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear the entire cart' })
  clearCart(@Req() req: any) {
    return this.cartService.clearCart(req.user.userId);
  }
}