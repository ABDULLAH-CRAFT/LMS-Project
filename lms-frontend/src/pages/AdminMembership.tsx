import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import { adminSidebarSections } from '../config/adminSidebar';
import { formatDateTime, formatMoney } from '../lib/financeFormat';
import {
  adminCreatePlan,
  adminListAllCourses,
  adminListPlans,
  adminListSubscriptions,
  adminSetPlanCourses,
  adminSetPlanStatus,
  adminSubscriptionSummary,
  adminUpdatePlan,
  apiErrorMessage,
} from '../lib/api/membership';
import type { AdminMembershipPlan, PlanFormValues, SubscriptionStatus } from '../types/membership';

import MembershipRevenuePanel from '../components/finance/MembershipRevenuePanel'; // R7

type Tab = 'plans' | 'subscribers' | 'revenue';

const TABS: { id: Tab; label: string }[] = [
  { id: 'plans', label: 'Plans' },
  { id: 'subscribers', label: 'Subscribers' },
  { id: 'revenue', label: 'Revenue' },
];

const th = 'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap text-left';
const td = 'px-4 py-3 text-sm text-text whitespace-nowrap';
const inputClass =
  'w-full bg-surface-strong border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-600/40';
const primaryButton =
  'bg-primary-600 text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50';
const ghostButton =
  'bg-surface-strong text-text rounded-full px-4 py-2 text-sm font-medium hover:bg-surface-high transition disabled:opacity-50';

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-secondary-100 text-secondary-700',
  TRIALING: 'bg-primary-100 text-primary-700',
  PAST_DUE: 'bg-danger-100 text-danger-700',
  CANCELLED: 'bg-surface-strong text-muted',
  EXPIRED: 'bg-surface-strong text-muted',
  PAUSED: 'bg-surface-strong text-muted',
  INACTIVE: 'bg-surface-strong text-muted',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_TONE[status] ?? 'bg-surface-strong text-muted'}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface rounded-2xl shadow-soft p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold mt-1 text-text">{value}</p>
    </div>
  );
}

// ───────────────────────── plan create / edit ─────────────────────────

function PlanFormModal({ plan, onClose }: { plan?: AdminMembershipPlan; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<PlanFormValues>({
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    price: plan?.price ?? '',
    includesAllCourses: plan?.includesAllCourses ?? false,
  });

  const save = useMutation({
    mutationFn: () => (plan ? adminUpdatePlan(plan.id, values) : adminCreatePlan(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-membership-plans'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-soft w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-text mb-4">{plan ? 'Edit plan' : 'New membership plan'}</h2>

        <label className="block text-xs text-muted mb-1">Name</label>
        <input className={`${inputClass} mb-3`} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />

        <label className="block text-xs text-muted mb-1">Description</label>
        <textarea
          className={`${inputClass} mb-3`}
          rows={3}
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
        />

        <label className="block text-xs text-muted mb-1">Price per month (INR)</label>
        <input
          className={`${inputClass} mb-1`}
          inputMode="decimal"
          placeholder="599.00"
          value={values.price}
          onChange={(e) => setValues({ ...values, price: e.target.value })}
        />
        {plan && <p className="text-[11px] text-muted mb-3">A new price only applies to future payments.</p>}

        <label className="flex items-center gap-2 text-sm text-text mt-3">
          <input
            type="checkbox"
            checked={values.includesAllCourses}
            onChange={(e) => setValues({ ...values, includesAllCourses: e.target.checked })}
          />
          Include every published course
        </label>

        {save.isError && <p className="text-sm text-danger-600 mt-3">{apiErrorMessage(save.error, 'Could not save the plan')}</p>}

        <div className="flex justify-end gap-2 mt-6">
          <button className={ghostButton} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={primaryButton} onClick={() => save.mutate()} disabled={save.isPending} type="button">
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── included courses picker ─────────────────────────

function PlanCoursesModal({ plan, onClose }: { plan: AdminMembershipPlan; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set(plan.courseIds));
  const [includesAll, setIncludesAll] = useState(plan.includesAllCourses);

  const coursesQuery = useQuery({ queryKey: ['admin-all-courses'], queryFn: adminListAllCourses });

  const save = useMutation({
    mutationFn: () => adminSetPlanCourses(plan.id, { courseIds: [...selected], includesAllCourses: includesAll }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-membership-plans'] });
      onClose();
    },
  });

  function toggle(courseId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-soft w-full max-w-lg p-6 max-h-[85vh] flex flex-col">
        <h2 className="text-lg font-bold text-text mb-1">Courses in “{plan.name}”</h2>
        <p className="text-xs text-muted mb-4">Members can open these courses while their subscription is active. Only published courses unlock.</p>

        <label className="flex items-center gap-2 text-sm text-text mb-3">
          <input type="checkbox" checked={includesAll} onChange={(e) => setIncludesAll(e.target.checked)} />
          Include every published course
        </label>

        <div className={`flex-1 overflow-y-auto border border-border rounded-xl divide-y divide-border ${includesAll ? 'opacity-50 pointer-events-none' : ''}`}>
          {coursesQuery.isLoading && <p className="p-4 text-sm text-muted">Loading courses…</p>}
          {coursesQuery.data?.map((course) => (
            <label key={course.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-text cursor-pointer">
              <input type="checkbox" checked={selected.has(course.id)} onChange={() => toggle(course.id)} />
              <span className="flex-1">{course.title}</span>
              <span className="text-[11px] text-muted">{course.status}</span>
            </label>
          ))}
        </div>

        {save.isError && <p className="text-sm text-danger-600 mt-3">{apiErrorMessage(save.error, 'Could not save courses')}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button className={ghostButton} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={primaryButton} onClick={() => save.mutate()} disabled={save.isPending} type="button">
            {save.isPending ? 'Saving…' : `Save (${includesAll ? 'all' : selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── tabs ─────────────────────────

function PlansTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminMembershipPlan | 'new' | null>(null);
  const [pickingCoursesFor, setPickingCoursesFor] = useState<AdminMembershipPlan | null>(null);

  const plansQuery = useQuery({ queryKey: ['admin-membership-plans'], queryFn: adminListPlans });

  const toggleStatus = useMutation({
    mutationFn: (plan: AdminMembershipPlan) => adminSetPlanStatus(plan.id, plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-membership-plans'] }),
  });

  return (
    <>
      <div className="flex justify-end mb-4">
        <button className={primaryButton} onClick={() => setEditing('new')} type="button">
          + New plan
        </button>
      </div>

      {toggleStatus.isError && <p className="text-sm text-danger-600 mb-3">{apiErrorMessage(toggleStatus.error, 'Could not change status')}</p>}

      <div className="bg-surface rounded-2xl shadow-soft overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className={th}>Plan</th>
              <th className={th}>Price / month</th>
              <th className={th}>Courses</th>
              <th className={th}>Active subscribers</th>
              <th className={th}>Status</th>
              <th className={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plansQuery.isLoading && (
              <tr>
                <td className={td} colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
            {plansQuery.data?.length === 0 && (
              <tr>
                <td className={td} colSpan={6}>
                  No plans yet. Create your first plan.
                </td>
              </tr>
            )}
            {plansQuery.data?.map((plan) => (
              <tr key={plan.id} className="border-b border-border last:border-0">
                <td className={td}>
                  <p className="font-medium">{plan.name}</p>
                  {plan.description && <p className="text-xs text-muted max-w-xs truncate">{plan.description}</p>}
                </td>
                <td className={td}>{formatMoney(plan.price)}</td>
                <td className={td}>{plan.includesAllCourses ? `All published (${plan.courseCount})` : plan.courseCount}</td>
                <td className={td}>
                  {plan.activeSubscribers} <span className="text-muted text-xs">/ {plan.totalSubscriptions} total</span>
                </td>
                <td className={td}>
                  <StatusBadge status={plan.status} />
                </td>
                <td className={`${td} space-x-2`}>
                  <button className="text-xs font-medium text-primary-600 hover:underline" onClick={() => setEditing(plan)} type="button">
                    Edit
                  </button>
                  <button className="text-xs font-medium text-primary-600 hover:underline" onClick={() => setPickingCoursesFor(plan)} type="button">
                    Courses
                  </button>
                  <button
                    className="text-xs font-medium text-muted hover:text-text"
                    onClick={() => toggleStatus.mutate(plan)}
                    disabled={toggleStatus.isPending}
                    type="button"
                  >
                    {plan.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <PlanFormModal plan={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {pickingCoursesFor && <PlanCoursesModal plan={pickingCoursesFor} onClose={() => setPickingCoursesFor(null)} />}
    </>
  );
}

const PAGE_SIZE = 20;
const STATUS_FILTERS: (SubscriptionStatus | '')[] = ['', 'ACTIVE', 'TRIALING', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED'];

function SubscribersTab() {
  const [status, setStatus] = useState<SubscriptionStatus | ''>('');
  const [page, setPage] = useState(0);

  const summaryQuery = useQuery({ queryKey: ['admin-subscription-summary'], queryFn: adminSubscriptionSummary });
  const listQuery = useQuery({
    queryKey: ['admin-subscriptions', status, page],
    queryFn: () => adminListSubscriptions(status, PAGE_SIZE, page * PAGE_SIZE),
  });

  const summary = summaryQuery.data;
  const list = listQuery.data;
  const totalPages = list ? Math.max(1, Math.ceil(list.total / PAGE_SIZE)) : 1;

  return (
    <>
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Active now" value={summary.activeNow} />
          <StatCard label="New (30 days)" value={summary.newLast30Days} />
          <StatCard label="Cancelling at period end" value={summary.cancellingAtPeriodEnd} />
          <StatCard label="Past due" value={summary.pastDue} />
          <StatCard label="Cancelled" value={summary.cancelled} />
          <StatCard label="Expired" value={summary.expired} />
          <StatCard label="Paused" value={summary.paused} />
          <StatCard label="All subscriptions" value={summary.total} />
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <label className="text-xs text-muted">Status</label>
        <select
          className="bg-surface-strong border border-border rounded-full px-3 py-1.5 text-xs text-text"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SubscriptionStatus | '');
            setPage(0);
          }}
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option || 'all'} value={option}>
              {option || 'All'}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-surface rounded-2xl shadow-soft overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className={th}>Student</th>
              <th className={th}>Plan</th>
              <th className={th}>Status</th>
              <th className={th}>Started</th>
              <th className={th}>Paid through</th>
              <th className={th}>Cancel at end?</th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading && (
              <tr>
                <td className={td} colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
            {list?.items.length === 0 && (
              <tr>
                <td className={td} colSpan={6}>
                  No subscriptions match.
                </td>
              </tr>
            )}
            {list?.items.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className={td}>
                  <p className="font-medium">{row.studentName}</p>
                  <p className="text-xs text-muted">{row.studentEmail}</p>
                </td>
                <td className={td}>
                  {row.planName} <span className="text-xs text-muted">({formatMoney(row.price)})</span>
                </td>
                <td className={td}>
                  <StatusBadge status={row.status} />
                </td>
                <td className={td}>{formatDateTime(row.startDate)}</td>
                <td className={td}>{formatDateTime(row.currentPeriodEnd)}</td>
                <td className={td}>{row.cancelAtPeriodEnd ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3 mt-4 text-xs text-muted">
        <span>
          Page {page + 1} of {totalPages}
        </span>
        <button className={ghostButton} disabled={page === 0} onClick={() => setPage((p) => p - 1)} type="button">
          Previous
        </button>
        <button className={ghostButton} disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)} type="button">
          Next
        </button>
      </div>
    </>
  );
}

export default function AdminMembership() {
  const [tab, setTab] = useState<Tab>('plans');

  return (
    <DashboardLayout sidebarSections={adminSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Membership</h1>
      <p className="text-muted mb-6">Plans, who has access to what, and your subscriber base.</p>

      <div className="flex gap-2 mb-6">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={[
              'px-4 py-1.5 rounded-full text-sm font-medium transition',
              tab === item.id ? 'bg-primary-100 text-primary-700 border border-primary-200' : 'bg-surface text-muted hover:text-text shadow-soft',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'plans' && <PlansTab />}
      {tab === 'subscribers' && <SubscribersTab />}
      {tab === 'revenue' && <MembershipRevenuePanel />}
    </DashboardLayout>
  );
}