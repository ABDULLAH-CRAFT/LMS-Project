export interface CourseProgress {
  completedLessonIds: string[];
  totalLessons: number;
  completedCount: number;
  percent: number;
}

export interface LearningStats {
  streakDays: number;
  lessonsCompleted: number;
  coursesCompleted: number;
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
}