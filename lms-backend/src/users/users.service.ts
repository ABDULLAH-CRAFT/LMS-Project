import { Injectable, UnauthorizedException } from '@nestjs/common'; // NEW import — UnauthorizedException
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

  async updateName(userId: string, name: string) { // NEW — updates just the name field
    const user = await this.userRepo.findOne({ where: { id: userId } }); // fetch the current row first
    if (!user) throw new UnauthorizedException('User not found'); // defensive — shouldn't happen since the JWT already proved they exist
    user.name = name; // mutate the field in memory
    return this.userRepo.save(user); // persist the change
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string) { // NEW — changes the password after verifying the old one
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash); // confirm they actually know the current password
    if (!valid) throw new UnauthorizedException('Current password is incorrect'); // reject if it doesn't match — prevents someone with just a stolen token from silently taking over the account

    user.passwordHash = await bcrypt.hash(newPassword, 10); // hash and store the new password
    await this.userRepo.save(user);
    return { message: 'Password updated successfully' };
  }
}