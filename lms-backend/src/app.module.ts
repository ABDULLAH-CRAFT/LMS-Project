import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { CourseContentModule } from './course-content/course-content.module';
import { CartModule } from './cart/cart.module';
import { NotificationSettingsModule } from './notification-settings/notification-settings.module';
import { UploadsModule } from './uploads/uploads.module';
import { ProgressModule } from './progress/progress.module';
import { LessonResourcesModule } from './lesson-resources/lesson-resources.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { TeacherInsightsModule } from './teacher-insights/teacher-insights.module';
import { join } from 'path';
import { FinanceModule } from './finance/finance.module';
import { MembershipsModule } from './memberships/memberships.module'; // R6
import { EngagementModule } from './engagement/engagement.module'; // R8
import { MembershipPeriodsModule } from './membership-periods/membership-periods.module'; // R10
import { MembershipAnalyticsModule } from './membership-analytics/membership-analytics.module'; // R11
import { PayoutsModule } from './payouts/payouts.module'; // R13
import { ReconciliationModule } from './reconciliation/reconciliation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 100 },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST'),
        port: config.get('DATABASE_PORT'),
        username: config.get('DATABASE_USER'),
        password: config.get('DATABASE_PASSWORD'),
        database: config.get('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // unchanged for now - financial tables are opted out per-entity (synchronize: false); Phase R15 removes this
        migrations: [join(__dirname, 'migrations', __filename.endsWith('.ts') ? '*.ts' : '*.js')], // NEW
        migrationsRun: config.get('DB_MIGRATIONS_RUN') === 'true', // NEW - off by default; run migrations manually
      }),
    }),
    UsersModule,
    AuthModule,
    AdminModule,
    MailModule,
    CoursesModule,
    EnrollmentsModule,
    CourseContentModule,
    CartModule,
    NotificationSettingsModule,
    UploadsModule,
    ProgressModule,
    LessonResourcesModule,
    AssignmentsModule,
    SubmissionsModule,
    FinanceModule,
    MembershipsModule,
    EngagementModule, // R8
    MembershipPeriodsModule, // R10
    MembershipAnalyticsModule, // R11
    PayoutsModule, // R13
    ReconciliationModule, // R14
    AnnouncementsModule,
    TeacherInsightsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}