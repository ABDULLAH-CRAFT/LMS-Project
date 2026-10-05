import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMembershipFoundation1790899200000 implements MigrationInterface {
  name = 'CreateMembershipFoundation1790899200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "membership_billing_period" AS ENUM ('MONTHLY')`);
    await queryRunner.query(`CREATE TYPE "membership_plan_status" AS ENUM ('ACTIVE','INACTIVE')`);
    await queryRunner.query(
      `CREATE TYPE "subscription_status" AS ENUM ('ACTIVE','TRIALING','PAST_DUE','CANCELLED','EXPIRED','PAUSED')`,
    );

    // ───────── membership_plans ─────────
    await queryRunner.query(`
      CREATE TABLE "membership_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "price" numeric(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'INR',
        "billingPeriod" "membership_billing_period" NOT NULL DEFAULT 'MONTHLY',
        "status" "membership_plan_status" NOT NULL DEFAULT 'ACTIVE',
        "includesAllCourses" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_membership_plans" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_membership_plans_price" CHECK ("price" > 0)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_membership_plans_name" ON "membership_plans" (lower("name"))`);

    // ───────── membership_plan_courses (which courses a plan unlocks) ─────────
    await queryRunner.query(`
      CREATE TABLE "membership_plan_courses" (
        "membershipPlanId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_membership_plan_courses" PRIMARY KEY ("membershipPlanId", "courseId"),
        CONSTRAINT "FK_mpc_plan" FOREIGN KEY ("membershipPlanId") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_mpc_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_mpc_courseId" ON "membership_plan_courses" ("courseId")`);

    // ───────── subscriptions ─────────
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "membershipPlanId" uuid NOT NULL,
        "provider" character varying(32) NOT NULL DEFAULT 'razorpay',
        "providerSubscriptionId" character varying(191),
        "status" "subscription_status" NOT NULL DEFAULT 'ACTIVE',
        "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "currentPeriodStart" TIMESTAMP WITH TIME ZONE NOT NULL,
        "currentPeriodEnd" TIMESTAMP WITH TIME ZONE NOT NULL,
        "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
        "cancelledAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_subscriptions_period" CHECK ("currentPeriodEnd" > "currentPeriodStart"),
        CONSTRAINT "FK_subscriptions_student" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_subscriptions_plan" FOREIGN KEY ("membershipPlanId") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_subscriptions_studentId" ON "subscriptions" ("studentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_subscriptions_planId" ON "subscriptions" ("membershipPlanId")`);
    await queryRunner.query(`CREATE INDEX "IDX_subscriptions_status_end" ON "subscriptions" ("status", "currentPeriodEnd")`);
    // A student can hold only ONE live subscription per plan (renewals extend it; history rows are terminal ones).
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_subscriptions_live_per_plan" ON "subscriptions" ("studentId", "membershipPlanId")
      WHERE "status" IN ('ACTIVE','TRIALING','PAST_DUE','PAUSED')
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_subscriptions_provider_id" ON "subscriptions" ("provider", "providerSubscriptionId")
      WHERE "providerSubscriptionId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TABLE "membership_plan_courses"`);
    await queryRunner.query(`DROP TABLE "membership_plans"`);
    await queryRunner.query(`DROP TYPE "subscription_status"`);
    await queryRunner.query(`DROP TYPE "membership_plan_status"`);
    await queryRunner.query(`DROP TYPE "membership_billing_period"`);
  }
}