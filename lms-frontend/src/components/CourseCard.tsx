import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Course } from '../types/course';
import { GRADIENTS } from '../config/gradients';

interface CourseCardProps {
  course: Course;
  index: number;
  footer: ReactNode;
}

export default function CourseCard({ course, index, footer }: CourseCardProps) {
  return (
    <Link
      to={`/courses/${course.id}`}
      className="bg-surface rounded-2xl overflow-hidden shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group block" // soft-UI card — shadow instead of glow-border on hover
    >
      <div className={`h-32 bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} flex items-center justify-center relative overflow-hidden`}>
        {course.coverImageUrl ? ( // NEW — the teacher's uploaded cover; courses without one keep the gradient + initial
          <img src={course.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <span className="text-4xl font-bold text-white">{course.title.charAt(0).toUpperCase()}</span>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10" />
          </>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-text mb-1.5 group-hover:text-primary-600 transition-colors"> {/* indigo on hover */}
          {course.title}
        </h3>
        <p className="text-sm text-muted mb-4 line-clamp-2">{course.description}</p> {/* CHANGED — muted gray for dark bg */}
        {footer}
      </div>
    </Link>
  );
}