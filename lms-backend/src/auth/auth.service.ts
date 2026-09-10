import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const user = await this.usersService.createWithHashedPassword({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      role: UserRole.STUDENT,
    });

    this.mailService.sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    return this.signTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.signTokens(user.id, user.email, user.role);
  }

  /** Exchanges a valid refresh token for a brand-new access + refresh pair (rotation). */
  async refresh(dto: RefreshTokenDto) {
    let payload: TokenPayload;
    try {
      payload = this.jwtService.verify<TokenPayload>(dto.refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Without this check, an access token signed with the wrong secret would
    // still fail — but ALSO without it, nothing stops someone from putting an
    // access token here and using it to keep minting new tokens forever.
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Confirms the user still exists (e.g. wasn't deleted since the token was issued).
    const user = await this.usersService.findByEmail(payload.email);
    if (!user) throw new UnauthorizedException('User no longer exists');

    return this.signTokens(user.id, user.email, user.role);
  }

  private signTokens(userId: string, email: string, role: string) {
    const accessPayload: TokenPayload = { sub: userId, email, role, type: 'access' };
    const refreshPayload: TokenPayload = { sub: userId, email, role, type: 'refresh' };

    return {
      accessToken: this.jwtService.sign(accessPayload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      refreshToken: this.jwtService.sign(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    };
  }
}