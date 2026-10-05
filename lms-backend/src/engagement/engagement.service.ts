import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MembershipAccessService } from '../memberships/membership-access.service';
import { ENGAGEMENT_CONFIG } from './engagement.config';
import { LearningEventType } from './engagement.enums';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

// Events after which we also check "did this student come back on a later day?"
const RETURN_TRIGGERS = new Set<LearningEventType>([
  LearningEventType.LESSON_STARTED,
  LearningEventType.LESSON_COMPLETED,
  LearningEventType.ASSIGNMENT_SUBMITTED,
]);

export interface TrackEventInput {
  studentId: string; // from the JWT, never from the request body
  courseId: string;
  lessonId?: string | null;
  eventType: LearningEventType;
  dedupeScope: string; // WHAT the event is about (lessonId / courseId / assignmentId). Same scope = same event.
  totalLessons?: number; // only for COURSE_COMPLETED
  metadata?: Record<string, unknown>; // backend-supplied only
}

export interface TrackEventResult {
  recorded: boolean;
  points: number;
  reason?: string;
}

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly membershipAccess: MembershipAccessService,
  ) {}

  /**
   * Fire-and-forget safe wrapper used by feature code. Engagement tracking must NEVER
   * break a lesson completion / submission, so every error is logged and swallowed.
   */
  async track(input: TrackEventInput): Promise<TrackEventResult | null> {
    try {
      return await this.record(input);
    } catch (error) {
      this.logger.error(
        `Failed to record ${input.eventType} for student ${input.studentId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async record(input: TrackEventInput): Promise<TrackEventResult> {
    const { studentId, courseId, eventType, dedupeScope } = input;
    const lessonId = input.lessonId ?? null;

    if (!isUuid(studentId) || !isUuid(courseId) || (lessonId !== null && !isUuid(lessonId))) {
      return { recorded: false, points: 0, reason: 'INVALID_ID' };
    }

    // Trusted check: only students who really have access (purchase OR membership) generate events.
    const access = await this.membershipAccess.getCourseAccess(studentId, courseId);
    if (!access.hasAccess || !access.via) return { recorded: false, points: 0, reason: 'NO_ACCESS' };

    // Teacher is derived from the course - the client can never choose it.
    const courseRows: { teacherId: string }[] = await this.dataSource.query(
      `SELECT "teacherId" FROM "courses" WHERE "id" = $1`,
      [courseId],
    );
    const teacherId = courseRows[0]?.teacherId;
    if (!teacherId) return { recorded: false, points: 0, reason: 'COURSE_NOT_FOUND' };
    if (teacherId === studentId) return { recorded: false, points: 0, reason: 'SELF_ACTIVITY' };

    const dedupeKey = `${eventType}:${studentId}:${dedupeScope}`;

    // Cheap early exit so repeats don't run the anti-abuse queries.
    const existing = await this.dataSource.query(
      `SELECT 1 FROM "learning_activity_events" WHERE "dedupeKey" = $1 LIMIT 1`,
      [dedupeKey],
    );
    if (existing.length > 0) return { recorded: false, points: 0, reason: 'DUPLICATE' };

    let points = ENGAGEMENT_CONFIG.eventPoints[eventType] ?? 0;
    const metadata: Record<string, unknown> = { ...(input.metadata ?? {}) };

    if (points > 0) {
      const verdict = await this.evaluate(input, lessonId);
      Object.assign(metadata, verdict.metadata);
      if (verdict.reason) {
        points = 0;
        metadata.reason = verdict.reason;
      }
    }

    const inserted = await this.dataSource.query(
      `INSERT INTO "learning_activity_events"
         ("studentId","teacherId","courseId","lessonId","eventType","points","accessVia","dedupeKey","metadata")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
       ON CONFLICT ("dedupeKey") DO NOTHING
       RETURNING "id"`,
      [studentId, teacherId, courseId, lessonId, eventType, points, access.via, dedupeKey, JSON.stringify(metadata)],
    );

    const wasInserted = inserted.length > 0; // false if a concurrent request won the race
    if (!wasInserted) return { recorded: false, points: 0, reason: 'DUPLICATE' };

    if (RETURN_TRIGGERS.has(eventType)) {
      await this.recordReturnIfApplicable(studentId, teacherId, courseId, access.via);
    }

    return { recorded: true, points, reason: points === 0 ? (metadata.reason as string | undefined) : undefined };
  }

  // ───────────────────────── anti-abuse ─────────────────────────

  private async evaluate(
    input: TrackEventInput,
    lessonId: string | null,
  ): Promise<{ reason: string | null; metadata: Record<string, unknown> }> {
    const cfg = ENGAGEMENT_CONFIG;

    // 1) velocity guard
    const recent = await this.dataSource.query(
      `SELECT COUNT(*)::int AS "c" FROM "learning_activity_events"
        WHERE "studentId" = $1 AND "points" > 0
          AND "occurredAt" > now() - ($2::int * interval '1 minute')`,
      [input.studentId, cfg.velocityWindowMinutes],
    );
    if ((recent[0]?.c ?? 0) >= cfg.maxCountedEventsPerWindow) {
      return { reason: 'RATE_LIMITED', metadata: {} };
    }

    // 2) a lesson completion must be preceded by a start, a reasonable time earlier
    if (input.eventType === LearningEventType.LESSON_COMPLETED && lessonId) {
      const startKey = `${LearningEventType.LESSON_STARTED}:${input.studentId}:${lessonId}`;
      const started = await this.dataSource.query(
        `SELECT EXTRACT(EPOCH FROM (now() - "occurredAt"))::int AS "secs"
           FROM "learning_activity_events" WHERE "dedupeKey" = $1`,
        [startKey],
      );
      if (started.length === 0) {
        if (cfg.requireLessonStart) return { reason: 'NO_LESSON_START', metadata: {} };
        return { reason: null, metadata: { noStartEvent: true } };
      }
      const secs: number = started[0].secs;
      if (secs < cfg.minLessonSeconds) {
        return { reason: 'TOO_FAST', metadata: { dwellSeconds: secs } };
      }
      return { reason: null, metadata: { dwellSeconds: secs } };
    }

    // 3) a course completion needs most lessons to have been *counted* completions
    if (input.eventType === LearningEventType.COURSE_COMPLETED) {
      const total = input.totalLessons ?? 0;
      const counted = await this.dataSource.query(
        `SELECT COUNT(*)::int AS "c" FROM "learning_activity_events"
          WHERE "studentId" = $1 AND "courseId" = $2
            AND "eventType" = 'LESSON_COMPLETED' AND "points" > 0`,
        [input.studentId, input.courseId],
      );
      const countedLessons: number = counted[0]?.c ?? 0;
      const needed = Math.ceil(total * cfg.minCountedLessonRatioForCourseCompletion);
      if (total > 0 && countedLessons < needed) {
        return { reason: 'INSUFFICIENT_COUNTED_LESSONS', metadata: { countedLessons, totalLessons: total } };
      }
      return { reason: null, metadata: { countedLessons, totalLessons: total } };
    }

    return { reason: null, metadata: {} };
  }

  // One STUDENT_RETURNED per student per course per UTC day, only if they had earlier-day activity in that course.
  private async recordReturnIfApplicable(
    studentId: string,
    teacherId: string,
    courseId: string,
    accessVia: string,
  ): Promise<void> {
    const earlier = await this.dataSource.query(
      `SELECT 1 FROM "learning_activity_events"
        WHERE "studentId" = $1 AND "courseId" = $2 AND "eventType" <> 'STUDENT_RETURNED'
          AND "occurredAt" < (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
        LIMIT 1`,
      [studentId, courseId],
    );
    if (earlier.length === 0) return;

    const day = new Date().toISOString().slice(0, 10); // UTC date, matches the SQL above
    const dedupeKey = `${LearningEventType.STUDENT_RETURNED}:${studentId}:${courseId}:${day}`;
    await this.dataSource.query(
      `INSERT INTO "learning_activity_events"
         ("studentId","teacherId","courseId","lessonId","eventType","points","accessVia","dedupeKey","metadata")
       VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$8::jsonb)
       ON CONFLICT ("dedupeKey") DO NOTHING`,
      [
        studentId,
        teacherId,
        courseId,
        LearningEventType.STUDENT_RETURNED,
        ENGAGEMENT_CONFIG.eventPoints[LearningEventType.STUDENT_RETURNED] ?? 0,
        accessVia,
        dedupeKey,
        JSON.stringify({ day }),
      ],
    );
  }
}