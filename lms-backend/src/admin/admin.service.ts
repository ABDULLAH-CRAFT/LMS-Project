import { Injectable, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../users/entities/user.entity';
import { CreateTeacherDto } from './create-teacher.dto';

@Injectable()
export class AdminService {
  constructor(
    private usersService: UsersService,
    private mailService: MailService,
  ) {}

  async createTeacher(dto: CreateTeacherDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const teacher = await this.usersService.createWithHashedPassword({ // CHANGED — was manual bcrypt.hash + usersService.create
      email: dto.email,
      password: dto.password,
      name: dto.name,
      role: UserRole.TEACHER, // still the only place this role gets assigned
    });

    await this.mailService.sendTeacherInviteEmail(teacher.email, teacher.name, dto.password);
    return { message: `Teacher account created for ${teacher.email}` };
  }

  async listTeachers() {
    const teachers = await this.usersService.findAllByRole(UserRole.TEACHER);
    return teachers.map(({ passwordHash, ...safeTeacher }) => safeTeacher);
  }
}