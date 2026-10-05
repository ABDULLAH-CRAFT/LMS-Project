import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLearningActivityEvents1791072000000 implements MigrationInterface {
  name = 'CreateLearningActivityEvents1791072000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "learning_event_type" AS ENUM (
        'COURSE_STARTED','LESSON_STARTED','LESSON_COMPLETED','QUIZ_ATTEMPTED','QUIZ_COMPLETED',
        'ASSIGNMENT_SUBMITTED','COURSE_COMPLETED','CERTIFICATE_EARNED','STUDENT_RETURNED','COURSE_RATED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "learning_activity_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "teacherId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "lessonId" uuid,
        "eventType" "learning_event_type" NOT NULL,
        "points" integer NOT NULL DEFAULT 0,
        "accessVia" character varying(20) NOT NULL,
        "dedupeKey" character varying(200) NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_learning_activity_events" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_learning_activity_events_dedupe" UNIQUE ("dedupeKey"),
        CONSTRAINT "CHK_learning_activity_events_points" CHECK ("points" >= 0),
        CONSTRAINT "CHK_learning_activity_events_via" CHECK ("accessVia" IN ('ENROLLMENT','MEMBERSHIP')),
        CONSTRAINT "FK_learning_events_student" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_learning_events_teacher" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    // courseId / lessonId deliberately have NO foreign key: lessons are deletable by teachers and
    // engagement history must survive that (same reason the rows are denormalized).

    await queryRunner.query(`CREATE INDEX "IDX_learning_events_teacher_time" ON "learning_activity_events" ("teacherId","occurredAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_learning_events_course_time" ON "learning_activity_events" ("courseId","occurredAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_learning_events_student_time" ON "learning_activity_events" ("studentId","occurredAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_learning_events_type_time" ON "learning_activity_events" ("eventType","occurredAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_learning_events_student_course" ON "learning_activity_events" ("studentId","courseId")`);

    // Append-only: reuses the guard function created by the R1 migration.
    await queryRunner.query(
      `CREATE TRIGGER "trg_learning_activity_events_append_only" BEFORE UPDATE OR DELETE ON "learning_activity_events" FOR EACH ROW EXECUTE FUNCTION revenue_block_mutation()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "trg_learning_activity_events_no_truncate" BEFORE TRUNCATE ON "learning_activity_events" FOR EACH STATEMENT EXECUTE FUNCTION revenue_block_mutation()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "learning_activity_events"`);
    await queryRunner.query(`DROP TYPE "learning_event_type"`);
  }
}