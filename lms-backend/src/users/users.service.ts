// lms-backend/src/users/users.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';

interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  findById(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  findAllByRole(role: UserRole) {
    return this.userRepo.find({ where: { role }, order: { createdAt: 'DESC' } });
  }

  async createWithHashedPassword(input: CreateUserInput) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = this.userRepo.create({
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
    });
    return this.userRepo.save(user);
  }

  async updateName(userId: string, name: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    user.name = name;
    return this.userRepo.save(user);
  }

  async deleteById(userId: string) { // NEW — permanently removes the user row from the DB
    const result = await this.userRepo.delete({ id: userId });
    return (result.affected ?? 0) > 0; // true if a row was actually deleted, false if the id didn't exist
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
    return { message: 'Password updated successfully' };
  }
}