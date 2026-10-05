import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LearningEventType } from './engagement.enums';

export interface EventFilters {
  from?: string;
  to?: string;
  teacherId?: string;
  studentId?: string;
  courseId?: string;
  eventType?: string;
  limit: number;
  offset: number;
}

@Injectable()
export class EngagementQueryService {
  constructor(private readonly dataSource: DataSource) {}

  private range(from?: string, to?: string) {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date. Use a full ISO date such as 2026-10-01T00:00:00Z');
    }
    if (start >= end) throw new BadRequestException('"from" must be before "to"');
    return { start, end };
  }

  async summary(from?: string, to?: string) {
    const { start, end } = this.range(from, to);

    const byType = await this.dataSource.query(
      `SELECT "eventType",
              COUNT(*)::int AS "events",
              COUNT(*) FILTER (WHERE "points" > 0)::int AS "countedEvents",
              COALESCE(SUM("points"), 0)::int AS "points"
         FROM "learning_activity_events"
        WHERE "occurredAt" >= $1 AND "occurredAt" < $2
        GROUP BY "eventType" ORDER BY "eventType"`,
      [start, end],
    );

    const byTeacher = await this.dataSource.query(
      `SELECT e."teacherId", u."name" AS "teacherName",
              COUNT(DISTINCT e."studentId") FILTER (WHERE e."points" > 0)::int AS "activeLearners",
              COUNT(*) FILTER (WHERE e."eventType" = 'LESSON_COMPLETED' AND e."points" > 0)::int AS "lessonCompletions",
              COUNT(*) FILTER (WHERE e."eventType" = 'COURSE_COMPLETED' AND e."points" > 0)::int AS "courseCompletions",
              COUNT(*) FILTER (WHERE e."eventType" IN ('ASSIGNMENT_SUBMITTED','QUIZ_ATTEMPTED','QUIZ_COMPLETED') AND e."points" > 0)::int AS "assessmentEvents",
              COUNT(DISTINCT e."studentId") FILTER (WHERE e."eventType" = 'STUDENT_RETURNED')::int AS "returningLearners",
              COALESCE(SUM(e."points"), 0)::int AS "totalPoints",
              COALESCE(SUM(e."points") FILTER (WHERE e."accessVia" = 'MEMBERSHIP'), 0)::int AS "membershipPoints"
         FROM "learning_activity_events" e
         JOIN "users" u ON u."id" = e."teacherId"
        WHERE e."occurredAt" >= $1 AND e."occurredAt" < $2
        GROUP BY e."teacherId", u."name"
        ORDER BY "totalPoints" DESC`,
      [start, end],
    );

    return { from: start.toISOString(), to: end.toISOString(), byType, byTeacher };
  }

  async events(f: EventFilters) {
    const { start, end } = this.range(f.from, f.to);
    if (f.eventType && !Object.values(LearningEventType).includes(f.eventType as LearningEventType)) {
      throw new BadRequestException('Unknown eventType');
    }

    const where: string[] = [`e."occurredAt" >= $1`, `e."occurredAt" < $2`];
    const params: unknown[] = [start, end];
    const add = (sql: string, value: unknown) => {
      params.push(value);
      where.push(sql.replace('?', `$${params.length}`));
    };
    if (f.teacherId) add(`e."teacherId" = ?`, f.teacherId);
    if (f.studentId) add(`e."studentId" = ?`, f.studentId);
    if (f.courseId) add(`e."courseId" = ?`, f.courseId);
    if (f.eventType) add(`e."eventType" = ?`, f.eventType);

    const whereSql = where.join(' AND ');

    const totalRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS "total" FROM "learning_activity_events" e WHERE ${whereSql}`,
      params,
    );

    const rows = await this.dataSource.query(
      `SELECT e."id", e."eventType", e."points", e."accessVia", e."occurredAt", e."metadata",
              e."courseId", c."title" AS "courseTitle",
              e."lessonId",
              e."teacherId", t."name" AS "teacherName",
              e."studentId", s."name" AS "studentName"
         FROM "learning_activity_events" e
         LEFT JOIN "courses" c ON c."id" = e."courseId"
         JOIN "users" t ON t."id" = e."teacherId"
         JOIN "users" s ON s."id" = e."studentId"
        WHERE ${whereSql}
        ORDER BY e."occurredAt" DESC
        LIMIT ${Number(f.limit)} OFFSET ${Number(f.offset)}`,
      params,
    );

    return { total: totalRows[0]?.total ?? 0, limit: f.limit, offset: f.offset, items: rows };
  }
}