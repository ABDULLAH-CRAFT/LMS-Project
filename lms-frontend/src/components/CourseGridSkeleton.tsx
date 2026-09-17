interface CourseGridSkeletonProps {
  count?: number;
}

export default function CourseGridSkeleton({ count = 3 }: CourseGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, n) => (
        <div key={n} className="bg-surface rounded-2xl overflow-hidden shadow-soft animate-pulse"> {/* soft-UI skeleton card, matches CourseCard */}
          <div className="h-32 bg-surface-strong" />
          <div className="p-5 space-y-2">
            <div className="h-4 bg-surface-strong rounded w-3/4" />
            <div className="h-3 bg-surface-strong rounded w-full" />
            <div className="h-3 bg-surface-strong rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}