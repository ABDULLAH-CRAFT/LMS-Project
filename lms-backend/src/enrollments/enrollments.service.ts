import { Injectable, ConflictException } from '@nestjs/common'; // Nest decorator + built-in exception
import { InjectRepository } from '@nestjs/typeorm'; // repository injection
import { Repository } from 'typeorm'; // repository type
import { Enrollment } from './entities/enrollment.entity'; // the entity
import { CoursesService } from '../courses/courses.service'; // to verify the course exists (throws 404 automatically if not)
import { CreateEnrollmentDto } from './dto/create-enrollment.dto'; // DTO

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>, // gives us .find(), .save(), etc.
    private coursesService: CoursesService, // injected from CoursesModule, now that it's exported
  ) {}

  async enroll(studentId: string, dto: CreateEnrollmentDto) {
    await this.coursesService.findOne(dto.courseId); // confirms the course exists — throws NotFoundException automatically if not, so we don't duplicate that check here

    const existing = await this.enrollmentRepo.findOne({ // check if this student is already enrolled in this course
      where: { studentId, courseId: dto.courseId },
    });
    if (existing) throw new ConflictException('Already enrolled in this course'); // prevents duplicate enrollments

    const enrollment = this.enrollmentRepo.create({ studentId, courseId: dto.courseId }); // build in memory — status defaults to ACTIVE automatically
    return this.enrollmentRepo.save(enrollment); // persist to DB
  }

  findMyEnrollments(studentId: string) { // used by the "My Courses" page
    return this.enrollmentRepo.find({
      where: { studentId }, // only this student's enrollments
      order: { enrolledAt: 'DESC' }, // most recently enrolled first
      relations: {
        course: true,
      },// explicitly loads the related course (eager: true on the entity already does this, but being explicit here is clearer)
    });
  }

  async isEnrolled(studentId: string, courseId: string): Promise<boolean> { // used by the course detail page to show "Enrolled" vs "Enroll"
    const enrollment = await this.enrollmentRepo.findOne({ where: { studentId, courseId } });
    return !!enrollment; // converts a found row (or null) into a clean true/false
  }
}