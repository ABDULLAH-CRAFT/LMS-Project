import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import DashboardLayout from '../components/DashboardLayout';
import { teacherSidebarSections } from '../config/teacherSidebar';
import type { EarningsResponse } from '../types/insights';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short' });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-2xl shadow-soft p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold text-text mt-1">{value}</p>
    </div>
  );
}

export default function TeacherEarnings() {
  const earningsQuery = useQuery({
    queryKey: ['teacher-earnings'],
    queryFn: async () => (await api.get<EarningsResponse>('/teacher/earnings')).data,
  });

  const data = earningsQuery.data;
  const maxMonthly = Math.max(1, ...(data?.monthly.map((m) => m.revenue) ?? [0]));

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Earnings</h1>
      <p className="text-muted mb-8">Sales from paid enrollments in your courses (gross, before any platform fees).</p>

      {earningsQuery.isLoading && <p className="text-sm text-muted">Loading earnings...</p>}
      {earningsQuery.isError && <p className="text-sm text-red-500">Couldn't load earnings.</p>}

      {data && (
        <div className="space-y-6 max-w-5xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total revenue" value={money.format(data.totals.revenue)} />
            <StatCard label="This month" value={money.format(data.totals.thisMonthRevenue)} />
            <StatCard label="Paid sales" value={String(data.totals.salesCount)} />
            <StatCard label="Average sale" value={money.format(data.totals.averageOrderValue)} />
          </div>

          {/* Monthly revenue — last 6 months */}
          <div className="bg-surface rounded-2xl shadow-soft p-5">
            <p className="text-sm font-semibold text-text mb-4">Revenue — last 6 months</p>
            <div className="flex items-end gap-3 h-44">
              {data.monthly.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                  <span className="text-[11px] text-muted mb-1 truncate">
                    {m.revenue > 0 ? money.format(m.revenue) : ''}
                  </span>
                  <div
                    className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-primary-600 to-secondary-400"
                    style={{ height: `${Math.max(2, (m.revenue / maxMonthly) * 100)}%`, opacity: m.revenue > 0 ? 1 : 0.25 }}
                    title={`${m.sales} sale${m.sales === 1 ? '' : 's'}`}
                  />
                  <span className="text-xs text-muted mt-2">{monthLabel(m.month)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Per-course sales */}
            <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
              <p className="text-sm font-semibold text-text px-5 py-4 border-b border-border">Sales by course</p>
              {data.byCourse.length === 0 && <p className="px-5 py-6 text-sm text-muted">No courses yet.</p>}
              <div className="divide-y divide-border">
                {data.byCourse.map((course) => (
                  <div key={course.courseId} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{course.title}</p>
                      <p className="text-xs text-muted">
                        {course.salesCount} sale{course.salesCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-text shrink-0">{money.format(course.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent sales */}
            <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
              <p className="text-sm font-semibold text-text px-5 py-4 border-b border-border">Recent sales</p>
              {data.recentSales.length === 0 && <p className="px-5 py-6 text-sm text-muted">No paid sales yet.</p>}
              <div className="divide-y divide-border">
                {data.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{sale.courseTitle}</p>
                      <p className="text-xs text-muted truncate">
                        {sale.studentName} · {new Date(sale.paidAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-secondary-600 shrink-0">{money.format(sale.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}