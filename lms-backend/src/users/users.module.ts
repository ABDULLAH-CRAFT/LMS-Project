import { Module } from '@nestjs/common'; // Nest module decorator
import { TypeOrmModule } from '@nestjs/typeorm'; // registers entities for this module
import { User } from './entities/user.entity'; // the User entity
import { UsersService } from './users.service'; // existing service
import { UsersController } from './users.controller'; // NEW — the controller we just created

@Module({
  imports: [TypeOrmModule.forFeature([User])], // registers the User repository
  controllers: [UsersController], // NEW — without this, the /users/me route won't exist
  providers: [UsersService], // existing service registration
  exports: [UsersService], // so AuthModule/AdminModule can still use it
})
export class UsersModule {}