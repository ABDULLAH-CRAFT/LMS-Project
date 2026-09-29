import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'; // Nest decorator + exceptions
import { InjectRepository } from '@nestjs/typeorm'; // repository injection
import { Repository } from 'typeorm'; // repository type
import { CourseModule } from './entities/course-module.entity'; // module entity
import { Lesson } from './entities/lesson.entity'; // lesson entity
import { CoursesService } from '../courses/courses.service'; // to verify course ownership
import { CreateModuleDto } from './dto/create-module.dto'; // DTO
import { CreateLessonDto } from './dto/create-lesson.dto'; // DTO

@Injectable()
export class CourseContentService {
  constructor(
    @InjectRepository(CourseModule) private moduleRepo: Repository<CourseModule>, // repository for modules
    @InjectRepository(Lesson) private lessonRepo: Repository<Lesson>, // repository for lessons
    private coursesService: CoursesService, // to check course ownership
  ) {}

  private async verifyOwnership(courseId: string, teacherId: string) { // NEW shared helper — avoids repeating this check in every method (addresses the DRY point from earlier)
    const course = await this.coursesService.findOne(courseId); // throws 404 automatically if the course doesn't exist
    if (course.teacherId !== teacherId) { // ownership check
      throw new ForbiddenException('You do not own this course');
    }
    return course; // return it in case the caller needs it
  }

  async createModule(teacherId: string, courseId: string, dto: CreateModuleDto) {
    await this.verifyOwnership(courseId, teacherId); // confirms this teacher owns the course before allowing changes
    const module = this.moduleRepo.create({ ...dto, courseId }); // build in memory
    return this.moduleRepo.save(module); // persist
  }

  async createLesson(teacherId: string, courseId: string, moduleId: string, dto: CreateLessonDto) {
    await this.verifyOwnership(courseId, teacherId); // confirms ownership of the PARENT course

    const module = await this.moduleRepo.findOne({ where: { id: moduleId, courseId } }); // confirms the module belongs to THIS course, not some other one
    if (!module) throw new NotFoundException('Module not found in this course');

    const lesson = this.lessonRepo.create({ ...dto, moduleId }); // build in memory
    return this.lessonRepo.save(lesson); // persist
  }

  async getCurriculum(courseId: string) { // public — returns the full modules + lessons tree for a course
    const modules = await this.moduleRepo.find({ // fetch all modules for this course
      where: { courseId },
      order: { order: 'ASC' }, // respects the teacher's chosen ordering
    });

    const modulesWithLessons = await Promise.all( // fetch each module's lessons in parallel
      modules.map(async (module) => {
        const lessons = await this.lessonRepo.find({
          where: { moduleId: module.id },
          order: { order: 'ASC' },
        });
        return { ...module, lessons }; // attach the lessons array onto each module object
      }),
    );

    return modulesWithLessons; // array of modules, each with a nested lessons array
  }
}