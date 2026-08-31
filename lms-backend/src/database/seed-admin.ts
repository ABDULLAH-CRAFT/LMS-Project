import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

async function seedAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule); // boots Nest without starting the HTTP server
  const usersService = app.get(UsersService);

  const existingAdmin = await usersService.findByEmail(process.env.ADMIN_EMAIL!);
  if (existingAdmin) {
    console.log('Admin already exists, skipping.');
    await app.close();
    return;
  }

await usersService.createWithHashedPassword({ // CHANGED — was usersService.create() with manual bcrypt.hash, now uses the shared method
  email: process.env.ADMIN_EMAIL!, // ! asserts this env var exists, matches the pattern used elsewhere in this file
  password: process.env.ADMIN_PASSWORD!, // plain text in — createWithHashedPassword handles the hashing internally now
  name: 'Admin',
  role: UserRole.ADMIN,
});

  console.log(`Admin created: ${process.env.ADMIN_EMAIL}`);
  await app.close();
}

seedAdmin();