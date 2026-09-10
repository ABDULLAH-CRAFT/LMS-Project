import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from './entities/cart-item.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem]), CoursesModule],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService], // so EnrollmentsModule can inject it
})
export class CartModule {}