import type { ReactNode } from 'react';
import { Users, PlayCircle } from 'lucide-react';
import type { TeacherCourseSummary } from '../types/course';
import { GRADIENTS } from '../config/gradients';
import { chipClass } from '../config/ui';
import { formatPrice } from '../lib/format';

interface TeacherCourseCardProps {
  course: TeacherCourseSummary;
  index: number; // picks the fallback gradient, same as the student CourseCard
  children: ReactNode; // the action buttons for this card (Manage / Publish / Preview...)
}

// Teacher-side course card: same look as the student CourseCard, but shows status + real numbers instead of "Add to cart".
export default function TeacherCourseCard({ course, index, children }: TeacherCourseCardProps) {
  return (
    <div className="bg-surface rounded-2xl overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-200 flex flex-col">
      <div className={`relative h-36 bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} overflow-hidden`}>
        {course.coverImageUrl ? (
          <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className="text-4xl font-bold text-white">{course.title.charAt(0).toUpperCase()}</span>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10" />
          </div>
        )}
        <span
          className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-soft ${
            course.status === 'published' ? chipClass.published : chipClass.draft
          }`}
        >
          {course.status === 'published' ? 'Published' : 'Draft'}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-text mb-1 line-clamp-1">{course.title}</h3>
        <p className="text-sm text-muted line-clamp-2 mb-4">{course.description}</p>

        <div className="flex items-center gap-4 text-xs text-muted-dark mb-4 mt-auto">
          <span className="inline-flex items-center gap-1.5">
            <PlayCircle className="w-3.5 h-3.5" />
            {course.lessonCount} lesson{course.lessonCount !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {course.studentCount} student{course.studentCount !== 1 ? 's' : ''}
          </span>
          <span className="ml-auto font-semibold text-text">{formatPrice(course.price)}</span>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-border">{children}</div>
      </div>
    </div>
  );
}
