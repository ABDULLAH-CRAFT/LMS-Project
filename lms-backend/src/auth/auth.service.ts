import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'; // still needed for login's password comparison
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const user = await this.usersService.createWithHashedPassword({ // CHANGED — was manual bcrypt.hash + usersService.create
      email: dto.email,
      password: dto.password,
      name: dto.name,
      role: UserRole.STUDENT, // still hardcoded here — public register can ONLY ever create students
    });

    this.mailService.sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    return this.signTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash); // login still compares directly — unrelated to the create-user duplication
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.signTokens(user.id, user.email, user.role);
  }

  private signTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}