import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { Course, CourseStatus } from '../entities/course.entity';

// One topic per course — 50 total, so each becomes exactly one seeded course.
const TOPICS = [
  'React', 'Node.js', 'TypeScript', 'Python', 'Django', 'Machine Learning', 'Data Science', 'AWS', 'Docker', 'Kubernetes',
  'UI/UX Design', 'Figma', 'Digital Marketing', 'SEO', 'Copywriting', 'Photography', 'Video Editing', 'Excel', 'Power BI', 'SQL',
  'Java', 'Spring Boot', 'C++', 'Flutter', 'React Native', 'iOS Development', 'Android Development', 'Cybersecurity', 'Ethical Hacking', 'Blockchain',
  'Public Speaking', 'Leadership', 'Project Management', 'Agile & Scrum', 'Financial Modeling', 'Stock Trading', 'Personal Finance', 'Graphic Design', 'Illustration', 'Music Production',
  'Guitar', 'Piano', 'Yoga', 'Fitness Training', 'Nutrition', 'Spanish Language', 'French Language', 'IELTS Preparation', 'Content Writing', 'Game Development',
];

const TITLE_FORMATS = [
  (t: string) => `Complete Guide to ${t}`,
  (t: string) => `Mastering ${t}: From Zero to Pro`,
  (t: string) => `${t} for Beginners`,
  (t: string) => `${t} Bootcamp`,
  (t: string) => `Advanced ${t} Masterclass`,
];

// Names for demo teacher accounts — courses are spread across a few of
// them so the admin's teacher list and course ownership look realistic
// instead of one account owning all 50.
const DEMO_TEACHERS = [
  { name: 'Demo Teacher One', email: 'demo.teacher1@lms.dev' },
  { name: 'Demo Teacher Two', email: 'demo.teacher2@lms.dev' },
  { name: 'Demo Teacher Three', email: 'demo.teacher3@lms.dev' },
];
const DEMO_TEACHER_PASSWORD = 'Teacher@123'; // dev/demo only — not meant for production use

async function seedCourses() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const courseRepo = app.get<Repository<Course>>(getRepositoryToken(Course));

  // 1. Make sure we have teacher accounts to own the seeded courses.
  const teacherIds: string[] = [];
  for (const demo of DEMO_TEACHERS) {
    let teacher = await usersService.findByEmail(demo.email);
    if (!teacher) {
      teacher = await usersService.createWithHashedPassword({
        email: demo.email,
        password: DEMO_TEACHER_PASSWORD,
        name: demo.name,
        role: UserRole.TEACHER,
      });
      console.log(`Created teacher: ${demo.email}`);
    }
    teacherIds.push(teacher.id);
  }

  // 2. Create one course per topic, skipping any that already exist by
  // title so re-running this script is safe and doesn't create duplicates.
  let created = 0;
  for (let i = 0; i < TOPICS.length; i++) {
    const topic = TOPICS[i];
    const title = TITLE_FORMATS[i % TITLE_FORMATS.length](topic);

    const existing = await courseRepo.findOne({ where: { title } });
    if (existing) continue;

    const teacherId = teacherIds[i % teacherIds.length];
    const isFree = i % 10 === 0; // every 10th course is free, matching the web catalog's mix
    const price = isFree ? 0 : 499 + ((i * 137) % 4000); // varied, deterministic prices

    const course = courseRepo.create({
      title,
      description: `Learn ${topic} from the ground up with hands-on projects, real-world examples, and lifetime access. Perfect whether you're starting out or leveling up existing skills.`,
      price,
      status: CourseStatus.PUBLISHED, // published immediately so it shows up in Browse right away
      teacherId,
    });
    await courseRepo.save(course);
    created++;
  }

  console.log(`Seeded ${created} new course(s). Total topics: ${TOPICS.length}.`);
  await app.close();
}

seedCourses();