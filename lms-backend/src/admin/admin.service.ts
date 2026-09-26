// lms-backend/src/admin/admin.service.ts
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { CoursesService } from '../courses/courses.service';
import { UserRole } from '../users/entities/user.entity';
import { CreateTeacherDto } from './create-teacher.dto';

@Injectable()
export class AdminService {
  constructor(
    private usersService: UsersService,
    private mailService: MailService,
    private coursesService: CoursesService,
  ) {}

  async createTeacher(dto: CreateTeacherDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const teacher = await this.usersService.createWithHashedPassword({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      role: UserRole.TEACHER,
    });

    await this.mailService.sendTeacherInviteEmail(teacher.email, teacher.name, dto.password);
    return { message: `Teacher account created for ${teacher.email}` };
  }

  async listTeachers() {
    const teachers = await this.usersService.findAllByRole(UserRole.TEACHER);
    return teachers.map(({ passwordHash, ...safeTeacher }) => safeTeacher);
  }

  async deleteTeacher(teacherId: string) {
    const teacher = await this.usersService.findById(teacherId);
    if (!teacher) throw new NotFoundException('Teacher not found');
    if (teacher.role !== UserRole.TEACHER) {
      throw new BadRequestException('This account is not a teacher');
    }

    const ownedCourses = await this.coursesService.findByTeacher(teacherId);
    if (ownedCourses.length > 0) {
      throw new ConflictException(
        `Cannot delete this teacher — they still have ${ownedCourses.length} course(s). Reassign or delete those courses first.`,
      );
    }

    await this.usersService.deleteById(teacherId);
    return { message: `Removed teacher ${teacher.email}` };
  }

  async listAllCourses() { // NEW — every course, any status, with its teacher's name/email attached
    const courses = await this.coursesService.findAllWithTeacher();
    return courses.map((course) => {
      const { teacher, ...courseFields } = course;
      return {
        ...courseFields,
        teacher: teacher
          ? { id: teacher.id, name: teacher.name, email: teacher.email } // strip passwordHash etc. — never send that to the frontend
          : null, // defensive — shouldn't happen since teacherId is required, but a deleted-without-cleanup row shouldn't crash this
      };
    });
  }
}