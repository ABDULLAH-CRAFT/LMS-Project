import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CourseAccessVia = 'ENROLLMENT' | 'MEMBERSHIP' | null;

export interface CourseAccess {
  hasAccess: boolean;
  via: CourseAccessVia;
}

/**
 * THE one place that answers "can this student open this course?".
 *   1. Direct purchase -> an Enrollment row (unchanged).
 *   2. Membership      -> an active, paid-through subscription whose plan includes the course.
 * Membership never creates Enrollment rows - it is an entitlement, checked live.
 */
@Injectable()
export class MembershipAccessService {
  constructor(private readonly dataSource: DataSource) {}

  async getCourseAccess(studentId: string, courseId: string): Promise<CourseAccess> {
    if (!UUID_RE.test(courseId)) return { hasAccess: false, via: null };

    const enrolled = await this.dataSource.query(
      `SELECT 1 FROM "enrollments" WHERE "studentId" = $1 AND "courseId" = $2 LIMIT 1`,
      [studentId, courseId],
    );
    if (enrolled.length > 0) return { hasAccess: true, via: 'ENROLLMENT' };

    const entitled = await this.dataSource.query(
      `SELECT 1
         FROM "subscriptions" s
         JOIN "membership_plans" p ON p."id" = s."membershipPlanId"
         JOIN "courses" c ON c."id" = $2
        WHERE s."studentId" = $1
          AND s."status" IN ('ACTIVE','TRIALING')
          AND s."currentPeriodEnd" > now()
          AND c."status" = 'published'
          AND (
            p."includesAllCourses" = true
            OR EXISTS (SELECT 1 FROM "membership_plan_courses" pc WHERE pc."membershipPlanId" = p."id" AND pc."courseId" = c."id")
          )
        LIMIT 1`,
      [studentId, courseId],
    );
    if (entitled.length > 0) return { hasAccess: true, via: 'MEMBERSHIP' };

    return { hasAccess: false, via: null };
  }

  async hasCourseAccess(studentId: string, courseId: string): Promise<boolean> {
    return (await this.getCourseAccess(studentId, courseId)).hasAccess;
  }

  /** Published courses unlocked right now by the student's memberships. */
  listMembershipCourses(studentId: string) {
    return this.dataSource.query(
      `SELECT c."id", c."title", c."description", c."price"::text AS "price", c."coverImageUrl", c."teacherId"
         FROM "courses" c
        WHERE c."status" = 'published'
          AND EXISTS (
            SELECT 1
              FROM "subscriptions" s
              JOIN "membership_plans" p ON p."id" = s."membershipPlanId"
             WHERE s."studentId" = $1
               AND s."status" IN ('ACTIVE','TRIALING')
               AND s."currentPeriodEnd" > now()
               AND (
                 p."includesAllCourses" = true
                 OR EXISTS (SELECT 1 FROM "membership_plan_courses" pc WHERE pc."membershipPlanId" = p."id" AND pc."courseId" = c."id")
               )
          )
        ORDER BY c."title" ASC`,
      [studentId],
    );
  }
}