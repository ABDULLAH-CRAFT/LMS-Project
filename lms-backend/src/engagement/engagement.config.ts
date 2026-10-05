import { LearningEventType } from './engagement.enums';

// Raw points per event type (NOT the revenue weights - those live in the database, see engagement_weight_configs).
// 0 points = tracked for analytics only, never rewarded.
export const ENGAGEMENT_CONFIG = {
  eventPoints: {
    [LearningEventType.COURSE_STARTED]: 0,
    [LearningEventType.LESSON_STARTED]: 0,
    [LearningEventType.LESSON_COMPLETED]: 10,
    [LearningEventType.QUIZ_ATTEMPTED]: 2,
    [LearningEventType.QUIZ_COMPLETED]: 10,
    [LearningEventType.ASSIGNMENT_SUBMITTED]: 15,
    [LearningEventType.COURSE_COMPLETED]: 50,
    [LearningEventType.CERTIFICATE_EARNED]: 20,
    [LearningEventType.STUDENT_RETURNED]: 5,
    [LearningEventType.COURSE_RATED]: 5,
  } as Record<LearningEventType, number>,

  // A completion earns points only if the lesson was started at least this long before.
  minLessonSeconds: 15,

  // If true, completing a lesson that was never "started" earns 0 points.
  // Set to false ONLY as a temporary measure while the mobile app does not call the start endpoint yet.
  requireLessonStart: true,

  // Velocity guard: max point-earning events per student per rolling window.
  maxCountedEventsPerWindow: 30,
  velocityWindowMinutes: 10,

  // COURSE_COMPLETED earns points only if this share of lessons were counted completions.
  minCountedLessonRatioForCourseCompletion: 0.8,

  // R9 - how raw events become category metrics for the membership pool
  scoring: {
    perLearnerLessonCap: 50, // one student can add at most this many lesson completions to one teacher per period
    assessmentEventTypes: [LearningEventType.ASSIGNMENT_SUBMITTED, LearningEventType.QUIZ_COMPLETED] as LearningEventType[],
  },
};