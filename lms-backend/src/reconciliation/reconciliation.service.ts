import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { fromPaise, toPaise } from '../finance/money.util';
import { PayoutBalanceService } from '../payouts/payout-balance.service';
import { CheckSeverity, FIGURES_SQL, LEDGER_NET_SQL, PAID_PAYOUT_SQL, SQL_CHECKS } from './reconciliation.checks';

type Row = Record<string, any>;

const SAMPLE_LIMIT = 25;

export interface CheckSample {
  reference: string;
  detail: string;
  amount: string | null;
}

export interface CheckResult {
  code: string;
  title: string;
  description: string;
  severity: CheckSeverity;
  status: 'PASS' | 'FAIL';
  count: number;
  samples: CheckSample[];
}

export type AuditCategory = 'PAYOUT' | 'PERIOD' | 'REFUND' | 'CONFIG';
export const AUDIT_CATEGORIES: AuditCategory[] = ['PAYOUT', 'PERIOD', 'REFUND', 'CONFIG'];

// Read-only timeline assembled from data the earlier phases already store.
// (Phase R15 can add a dedicated audit table; nothing here needs to change when it does.)
const AUDIT_CTE = `
  WITH events AS (
    SELECT e."createdAt" AS "occurredAt", 'PAYOUT'::text AS "category", e."toStatus"::text AS "action",
           e."actorId" AS "actorId", COALESCE(e."note", '') AS "summary", e."payoutId"::text AS "reference"
      FROM "payout_events" e
    UNION ALL
    SELECT c."calculatedAt", 'PERIOD', 'CALCULATED (run ' || c."runNumber"::text || ')', c."calculatedById",
           'Teacher pool ' || c."teacherPool"::text || ' for period starting ' || p."periodStart"::text, c."periodId"::text
      FROM "revenue_period_calculations" c JOIN "revenue_periods" p ON p."id" = c."periodId"
    UNION ALL
    SELECT p."finalizedAt", 'PERIOD', 'FINALIZED', p."finalizedById",
           'Period ' || p."periodStart"::text || ' to ' || p."periodEnd"::text || ' is frozen', p."id"::text
      FROM "revenue_periods" p WHERE p."finalizedAt" IS NOT NULL
    UNION ALL
    SELECT r."occurredAt", 'REFUND', r."kind", r."initiatedById",
           r."amount"::text || ' on payment ' || r."paymentId"::text || COALESCE(' - ' || r."reason", ''), r."id"::text
      FROM "refunds" r
    UNION ALL
    SELECT r."createdAt", 'CONFIG', 'REVENUE RULE (' || r."sourceType"::text || ')', r."createdById",
           r."platformPercentage"::text || '% platform / ' || r."teacherPercentage"::text || '% teacher, effective ' || to_char(r."effectiveFrom", 'YYYY-MM-DD'),
           r."id"::text
      FROM "revenue_rules" r
    UNION ALL
    SELECT s."createdAt", 'CONFIG', 'PAYOUT SETTINGS', s."createdById",
           'Hold ' || s."holdDays"::text || ' days, minimum payout ' || s."minimumPayout"::text || COALESCE(' - ' || s."note", ''), s."id"::text
      FROM "payout_settings" s
    UNION ALL
    SELECT w."createdAt", 'CONFIG', 'ENGAGEMENT WEIGHTS', w."createdById",
           'Lessons ' || w."lessonCompletionBps"::text || ' / courses ' || w."courseCompletionBps"::text || ' / assessments ' || w."assessmentBps"::text
             || ' / returning ' || w."returningLearnerBps"::text || ' / ratings ' || w."ratingBps"::text || ' (basis points)',
           w."id"::text
      FROM "engagement_weight_configs" w
    UNION ALL
    SELECT x."createdAt", 'CONFIG', 'MEMBERSHIP TAX RATE', x."createdById",
           'Tax rate ' || x."taxRateBps"::text || ' bps, effective ' || to_char(x."effectiveFrom", 'YYYY-MM-DD') || COALESCE(' - ' || x."note", ''), x."id"::text
      FROM "membership_tax_configs" x
  )`;

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly balances: PayoutBalanceService,
  ) {}

  // ───────────────────────── live overview ─────────────────────────

  /** Runs every check against ONE consistent snapshot of the database. Writes nothing. */
  async overview() {
    const ranAt = new Date().toISOString();
    const { checks, figures } = await this.dataSource.transaction('REPEATABLE READ', async (m) => ({
      checks: await this.evaluate(m),
      figures: await this.figures(m),
    }));
    return this.buildOverview(ranAt, checks, figures);
  }

  /** Same as overview(), but also stores the result as an immutable snapshot (who ran it, when, what it found). */
  async run(adminId: string) {
    const live = await this.overview();
    const inserted: { id: string }[] = await this.dataSource.query(
      `INSERT INTO "reconciliation_runs" ("ranById","checkCount","failedCount","criticalIssues","warningIssues","results","figures")
       VALUES ($1::uuid,$2,$3,$4,$5,$6::jsonb,$7::jsonb) RETURNING "id"`,
      [
        adminId,
        live.summary.checkCount,
        live.summary.failedCount,
        live.summary.criticalIssues,
        live.summary.warningIssues,
        JSON.stringify(live.checks),
        JSON.stringify({ figures: live.figures, ties: live.ties }),
      ],
    );
    return { runId: inserted[0].id, ...live };
  }

  async listRuns() {
    const rows: Row[] = await this.dataSource.query(
      `SELECT r."id", r."ranAt", u."name" AS "ranByName", r."checkCount", r."failedCount", r."criticalIssues", r."warningIssues"
         FROM "reconciliation_runs" r LEFT JOIN "users" u ON u."id" = r."ranById"
        ORDER BY r."ranAt" DESC LIMIT 30`,
    );
    return rows.map((r) => ({
      id: r.id as string,
      ranAt: r.ranAt as string,
      ranByName: (r.ranByName as string | null) ?? null,
      checkCount: Number(r.checkCount),
      failedCount: Number(r.failedCount),
      criticalIssues: Number(r.criticalIssues),
      warningIssues: Number(r.warningIssues),
    }));
  }

  async getRun(runId: string) {
    const rows: Row[] = await this.dataSource.query(
      `SELECT r."id", r."ranAt", u."name" AS "ranByName", r."results", r."figures"
         FROM "reconciliation_runs" r LEFT JOIN "users" u ON u."id" = r."ranById" WHERE r."id" = $1::uuid`,
      [runId],
    );
    if (rows.length === 0) throw new NotFoundException('Reconciliation run not found');
    const r = rows[0];
    return {
      id: r.id as string,
      ranAt: r.ranAt as string,
      ranByName: (r.ranByName as string | null) ?? null,
      checks: r.results as CheckResult[],
      figures: (r.figures?.figures ?? {}) as Record<string, string>,
      ties: (r.figures?.ties ?? []) as unknown[],
    };
  }

  // ───────────────────────── audit trail ─────────────────────────

  async auditTrail(opts: { category?: AuditCategory; limit: number; offset: number }) {
    const category = opts.category ?? null;
    const rows: Row[] = await this.dataSource.query(
      `${AUDIT_CTE}
       SELECT x."occurredAt", x."category", x."action", x."actorId", u."name" AS "actorName", x."summary", x."reference"
         FROM events x LEFT JOIN "users" u ON u."id" = x."actorId"
        WHERE ($1::text IS NULL OR x."category" = $1)
        ORDER BY x."occurredAt" DESC, x."reference" ASC
        LIMIT $2 OFFSET $3`,
      [category, opts.limit, opts.offset],
    );
    const total: Row[] = await this.dataSource.query(
      `${AUDIT_CTE} SELECT COUNT(*)::int AS "n" FROM events x WHERE ($1::text IS NULL OR x."category" = $1)`,
      [category],
    );
    return {
      events: rows.map((r) => ({
        occurredAt: r.occurredAt as string,
        category: r.category as AuditCategory,
        action: r.action as string,
        actorId: (r.actorId as string | null) ?? null,
        actorName: (r.actorName as string | null) ?? null, // null = system / webhook
        summary: r.summary as string,
        reference: r.reference as string,
      })),
      paging: { limit: opts.limit, offset: opts.offset, total: Number(total[0].n) },
    };
  }

  // ───────────────────────── internals ─────────────────────────

  private async evaluate(m: EntityManager): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    for (const check of SQL_CHECKS) {
      const counted: Row[] = await m.query(`SELECT COUNT(*)::int AS "n" FROM (${check.sql}) q`);
      const count = Number(counted[0].n);
      const samples: Row[] = count > 0 ? await m.query(`SELECT * FROM (${check.sql}) q LIMIT ${SAMPLE_LIMIT}`) : [];
      results.push({
        code: check.code,
        title: check.title,
        description: check.description,
        severity: check.severity,
        status: count === 0 ? 'PASS' : 'FAIL',
        count,
        samples: samples.map((s) => ({ reference: String(s.reference), detail: String(s.detail), amount: s.amount ?? null })),
      });
    }

    results.push(await this.balanceCheck(m));
    return results;
  }

  /** Teacher balances (R13 buckets) must equal the ledger, and "paid" must equal the PAID payouts. */
  private async balanceCheck(m: EntityManager): Promise<CheckResult> {
    const { teachers } = await this.balances.listBalances();
    const ledger: Row[] = await m.query(LEDGER_NET_SQL);
    const paid: Row[] = await m.query(PAID_PAYOUT_SQL);

    const ledgerBy = new Map<string, bigint>(ledger.map((r) => [r.teacherId as string, toPaise(r.net)]));
    const paidBy = new Map<string, bigint>(paid.map((r) => [r.teacherId as string, toPaise(r.paid)]));
    const balanceBy = new Map(teachers.map((t) => [t.teacherId, t]));
    const ids = new Set<string>([...ledgerBy.keys(), ...paidBy.keys(), ...balanceBy.keys()]);

    const issues: CheckSample[] = [];
    for (const id of ids) {
      const balance = balanceBy.get(id);
      const lifetime = balance ? toPaise(balance.balances.lifetimeNet) : 0n;
      const paidBucket = balance ? toPaise(balance.balances.paidBalance) : 0n;
      const ledgerNet = ledgerBy.get(id) ?? 0n;
      const paidSum = paidBy.get(id) ?? 0n;

      if (lifetime !== ledgerNet) {
        issues.push({
          reference: id,
          detail: `Balance buckets total ${fromPaise(lifetime)} but the ledger says ${fromPaise(ledgerNet)}`,
          amount: fromPaise(lifetime - ledgerNet),
        });
      }
      if (paidBucket !== paidSum) {
        issues.push({
          reference: id,
          detail: `Paid balance is ${fromPaise(paidBucket)} but PAID payouts total ${fromPaise(paidSum)}`,
          amount: fromPaise(paidBucket - paidSum),
        });
      }
    }

    return {
      code: 'TEACHER_BALANCE_MISMATCH',
      title: 'Teacher balance differs from ledger / payouts',
      description: 'Pending + available + processing + paid must equal the teacher\'s ledger earnings, and paid must equal PAID payouts.',
      severity: 'CRITICAL',
      status: issues.length === 0 ? 'PASS' : 'FAIL',
      count: issues.length,
      samples: issues.slice(0, SAMPLE_LIMIT),
    };
  }

  private async figures(m: EntityManager) {
    const rows: Row[] = await m.query(FIGURES_SQL);
    const r = rows[0];
    const out: Record<string, string> = {};
    for (const key of Object.keys(r)) out[key] = fromPaise(toPaise(r[key]));

    const teacherEarnings = toPaise(out.teacherCourse) + toPaise(out.teacherMembership);
    out.teacherEarnings = fromPaise(teacherEarnings);
    out.teacherUnpaid = fromPaise(teacherEarnings - toPaise(out.payoutsPaid) - toPaise(out.payoutsInFlight));
    return out;
  }

  private buildOverview(ranAt: string, checks: CheckResult[], figures: Record<string, string>) {
    const ties = [
      {
        label: 'Paid payments  =  ledger gross',
        leftLabel: 'Paid course + membership items',
        left: figures.paymentsTotal,
        rightLabel: 'Ledger purchases + membership payments',
        right: figures.ledgerGross,
      },
      {
        label: 'Course ledger net  =  allocations',
        leftLabel: 'Course ledger net of refunds',
        left: figures.courseLedgerNet,
        rightLabel: 'Platform + teacher allocations',
        right: figures.allocatedTotal,
      },
    ].map((t) => ({ ...t, matches: toPaise(t.left) === toPaise(t.right) }));

    const failed = checks.filter((c) => c.status === 'FAIL');
    const criticalIssues = failed.filter((c) => c.severity === 'CRITICAL').reduce((n, c) => n + c.count, 0);
    const warningIssues = failed.filter((c) => c.severity === 'WARNING').reduce((n, c) => n + c.count, 0);
    const tiesBroken = ties.some((t) => !t.matches);

    const status = criticalIssues > 0 || tiesBroken ? 'CRITICAL' : warningIssues > 0 ? 'WARNINGS' : 'HEALTHY';

    return {
      ranAt,
      status,
      summary: {
        checkCount: checks.length,
        passedCount: checks.length - failed.length,
        failedCount: failed.length,
        criticalIssues,
        warningIssues,
      },
      ties,
      figures,
      checks,
    };
  }
}