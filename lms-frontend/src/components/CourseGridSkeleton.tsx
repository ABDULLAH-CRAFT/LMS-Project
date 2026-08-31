interface CourseGridSkeletonProps {
  count?: number;
}

export default function CourseGridSkeleton({ count = 3 }: CourseGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, n) => (
        <div key={n} className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl animate-pulse"> {/* CHANGED — glass skeleton instead of white/gray */}
          <div className="h-32 bg-white/5" /> {/* CHANGED — subtle light fill instead of solid gray */}
          <div className="p-5 space-y-2">
            <div className="h-4 bg-white/10 rounded w-3/4" /> {/* CHANGED — light-on-dark placeholder bars */}
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}