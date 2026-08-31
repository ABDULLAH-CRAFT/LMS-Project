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
      className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl hover:border-purple-500/30 hover:-translate-y-1 transition-all duration-200 cursor-pointer group block" // CHANGED — glass card style, purple border glow on hover instead of shadow
    >
      <div className={`h-32 bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} flex items-center justify-center relative overflow-hidden`}>
        <span className="text-4xl font-bold text-white/90">{course.title.charAt(0).toUpperCase()}</span>
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10" />
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-white mb-1.5 group-hover:text-purple-300 transition-colors"> {/* CHANGED — white text, purple on hover instead of underline (underline reads oddly on dark bg) */}
          {course.title}
        </h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p> {/* CHANGED — muted gray for dark bg */}
        {footer}
      </div>
    </Link>
  );
}