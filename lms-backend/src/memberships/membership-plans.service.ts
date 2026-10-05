import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { MembershipPlan } from './entities/membership-plan.entity';
import { MembershipPlanCourse } from './entities/membership-plan-course.entity';
import { MembershipBillingPeriod, MembershipPlanStatus } from './memberships.enums';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { SetPlanCoursesDto } from './dto/set-plan-courses.dto';

export interface MembershipPlanView {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  billingPeriod: MembershipBillingPeriod;
  status: MembershipPlanStatus;
  includesAllCourses: boolean;
  courseIds: string[];
  courseCount: number; // all published courses when includesAllCourses, otherwise the picked courses
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminMembershipPlanView extends MembershipPlanView {
  activeSubscribers: number;
  totalSubscriptions: number;
}

@Injectable()
export class MembershipPlansService {
  constructor(
    @InjectRepository(MembershipPlan) private readonly planRepo: Repository<MembershipPlan>,
    @InjectRepository(MembershipPlanCourse) private readonly planCourseRepo: Repository<MembershipPlanCourse>,
    private readonly dataSource: DataSource,
  ) {}

  // ───────────── reads ─────────────

  /** Public pricing page: ACTIVE plans only. */
  async listActive(): Promise<MembershipPlanView[]> {
    const plans = await this.planRepo.find({ where: { status: MembershipPlanStatus.ACTIVE }, order: { price: 'ASC' } });
    return this.toViews(plans);
  }

  async listAdmin(): Promise<AdminMembershipPlanView[]> {
    const plans = await this.planRepo.find({ order: { createdAt: 'DESC' } });
    const views = await this.toViews(plans);

    const counts: { planId: string; active: string; total: string }[] = await this.dataSource.query(`
      SELECT "membershipPlanId" AS "planId",
             COUNT(*) FILTER (WHERE "status" IN ('ACTIVE','TRIALING') AND "currentPeriodEnd" > now()) AS "active",
             COUNT(*) AS "total"
        FROM "subscriptions"
       GROUP BY "membershipPlanId"
    `);
    const byPlan = new Map(counts.map((row) => [row.planId, row]));

    return views.map((view) => ({
      ...view,
      activeSubscribers: Number(byPlan.get(view.id)?.active ?? 0),
      totalSubscriptions: Number(byPlan.get(view.id)?.total ?? 0),
    }));
  }

  async getOrThrow(id: string): Promise<MembershipPlan> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Membership plan not found');
    return plan;
  }

  // ───────────── admin writes ─────────────

  async create(dto: CreateMembershipPlanDto): Promise<MembershipPlanView> {
    try {
      const plan = await this.planRepo.save(
        this.planRepo.create({
          name: dto.name.trim(),
          description: dto.description?.trim() ?? '',
          price: dto.price,
          currency: 'INR', // never taken from the client
          billingPeriod: dto.billingPeriod ?? MembershipBillingPeriod.MONTHLY,
          status: MembershipPlanStatus.ACTIVE,
          includesAllCourses: dto.includesAllCourses ?? false,
        }),
      );
      return (await this.toViews([plan]))[0];
    } catch (error) {
      this.rethrowUniqueName(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateMembershipPlanDto): Promise<MembershipPlanView> {
    const plan = await this.getOrThrow(id);
    if (dto.name !== undefined) plan.name = dto.name.trim();
    if (dto.description !== undefined) plan.description = dto.description.trim();
    if (dto.price !== undefined) plan.price = dto.price;
    if (dto.billingPeriod !== undefined) plan.billingPeriod = dto.billingPeriod;
    if (dto.includesAllCourses !== undefined) plan.includesAllCourses = dto.includesAllCourses;

    try {
      const saved = await this.planRepo.save(plan);
      return (await this.toViews([saved]))[0];
    } catch (error) {
      this.rethrowUniqueName(error);
      throw error;
    }
  }

  /** Deactivating stops NEW sign-ups. Existing subscribers keep access until their paid period ends. */
  async setStatus(id: string, status: MembershipPlanStatus): Promise<MembershipPlanView> {
    const plan = await this.getOrThrow(id);
    plan.status = status;
    const saved = await this.planRepo.save(plan);
    return (await this.toViews([saved]))[0];
  }

  /** Replaces the plan's included-course set (and optionally the "all published courses" switch). */
  async setCourses(id: string, dto: SetPlanCoursesDto): Promise<MembershipPlanView> {
    const plan = await this.getOrThrow(id);
    const courseIds = [...new Set(dto.courseIds)];

    if (courseIds.length > 0) {
      const found: { id: string }[] = await this.dataSource.query(
        `SELECT "id" FROM "courses" WHERE "id" = ANY($1::uuid[])`,
        [courseIds],
      );
      if (found.length !== courseIds.length) {
        throw new BadRequestException('One or more selected courses do not exist');
      }
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(MembershipPlanCourse, { membershipPlanId: id });
      if (courseIds.length > 0) {
        await manager.insert(
          MembershipPlanCourse,
          courseIds.map((courseId) => ({ membershipPlanId: id, courseId })),
        );
      }
      if (dto.includesAllCourses !== undefined) {
        await manager.update(MembershipPlan, { id }, { includesAllCourses: dto.includesAllCourses });
      }
    });

    return (await this.toViews([await this.getOrThrow(plan.id)]))[0];
  }

  // ───────────── helpers ─────────────

  private async toViews(plans: MembershipPlan[]): Promise<MembershipPlanView[]> {
    if (plans.length === 0) return [];

    const links = await this.planCourseRepo.find({ where: { membershipPlanId: In(plans.map((p) => p.id)) } });
    const idsByPlan = new Map<string, string[]>();
    for (const link of links) {
      const list = idsByPlan.get(link.membershipPlanId) ?? [];
      list.push(link.courseId);
      idsByPlan.set(link.membershipPlanId, list);
    }

    const [{ count }]: { count: string }[] = await this.dataSource.query(
      `SELECT COUNT(*) AS "count" FROM "courses" WHERE "status" = 'published'`,
    );
    const publishedCount = Number(count);

    return plans.map((plan) => {
      const courseIds = idsByPlan.get(plan.id) ?? [];
      return {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        billingPeriod: plan.billingPeriod,
        status: plan.status,
        includesAllCourses: plan.includesAllCourses,
        courseIds,
        courseCount: plan.includesAllCourses ? publishedCount : courseIds.length,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      };
    });
  }

  private rethrowUniqueName(error: unknown): void {
    if ((error as { code?: string })?.code === '23505') {
      throw new ConflictException('A membership plan with this name already exists');
    }
  }
}