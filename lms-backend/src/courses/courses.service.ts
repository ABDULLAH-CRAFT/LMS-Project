import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'; // built-in exceptions that map to proper HTTP status codes
import { InjectRepository } from '@nestjs/typeorm'; // lets us inject a TypeORM repository
import { Repository, ILike } from 'typeorm'; // generic repository type with query methods, ILike for case-insensitive search
import { Course, CourseStatus } from 'src/entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private courseRepo: Repository<Course>, // gives us .find(), .save(), etc. for the Course table
  ) {}

  async create(teacherId: string, dto: CreateCourseDto) { // teacherId comes from the JWT, never from the request body
    const course = this.courseRepo.create({ ...dto, teacherId }); // builds a new Course instance in memory (not saved yet)
    return this.courseRepo.save(course); // actually writes it to the database
  }

  findPublished(search?: string) { // used by the student catalog — only ever returns published courses
    const trimmed = search?.trim();
    return this.courseRepo.find({
      where: {
        status: CourseStatus.PUBLISHED, // filters out drafts entirely
        ...(trimmed ? { title: ILike(`%${trimmed}%`) } : {}), // case-insensitive partial match on title, only applied when a search term is given
      },
      order: { createdAt: 'DESC' }, // newest courses first
    });
  }

  findByTeacher(teacherId: string) { // used by "My Courses" on the teacher dashboard — includes drafts, since it's their own view
    return this.courseRepo.find({
      where: { teacherId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) { // fetch a single course by ID
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found'); // returns a proper 404 instead of null
    return course;
  }

  async publish(id: string, teacherId: string) { // flips a draft to published — ownership-checked
    const course = await this.findOne(id); // reuses the method above, so we also get the 404 check for free
    if (course.teacherId !== teacherId) { // CRITICAL check — stops teacher A from publishing teacher B's course
      throw new ForbiddenException('You do not own this course');
    }
    course.status = CourseStatus.PUBLISHED;
    return this.courseRepo.save(course);
  }
}