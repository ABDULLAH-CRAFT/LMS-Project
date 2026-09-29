import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import TeacherRangeFilter from '../components/finance/TeacherRangeFilter';
import { teacherSidebarSections } from '../config/teacherSidebar';
import { useTeacherFinanceRange } from '../hooks/useTeacherFinanceRange';
import { getTeacherCourseEarnings } from '../lib/api/teacherFinance';
import { formatMoney } from '../lib/financeFormat';
import type { TeacherRangeView } from '../types/teacherFinance';

const th = 'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap';
const td = 'px-4 py-3 text-sm text-text whitespace-nowrap';

function rangeLabel(range: TeacherRangeView | undefined): string | undefined {
  if (!range) return undefined;
  return range.from && range.to ? `Showing ${range.from} to ${range.to} (IST)` : 'Showing all time';
}

export default function TeacherCourseEarnings() {
  const range = useTeacherFinanceRange('all');

  const coursesQuery = useQuery({
    queryKey: ['teacher-finance-courses', range.params],
    queryFn: () => getTeacherCourseEarnings(range.params),
    enabled: range.enabled,
  });

  const data = coursesQuery.data;

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Course Sales</h1>
      <p className="text-muted mb-6">What each of your courses earned, and how the sale was split between the LMS and you.</p>

      <TeacherRangeFilter
        preset={range.preset}
        from={range.from}
        to={range.to}
        onPresetChange={range.setPreset}
        onFromChange={range.setFrom}
        onToChange={range.setTo}
        resolvedLabel={rangeLabel(data?.range)}
      />

      {coursesQuery.isLoading && <p className="text-sm text-muted">Loading course earnings...</p>}
      {coursesQuery.isError && <p className="text-sm text-danger-600">Couldn't load course earnings.</p>}

      {data && (
        <div className="max-w-6xl">
          <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-strong/60">
                  <tr>
                    <th className={th}>Course</th>
                    <th className={`${th} text-right`}>Students</th>
                    <th className={`${th} text-right`}>Sales</th>
                    <th className={`${th} text-right`}>Gross revenue</th>
                    <th className={`${th} text-right`}>LMS share</th>
                    <th className={`${th} text-right`}>Your share</th>
                    <th className={`${th} text-right`}>Refunds</th>
                    <th className={`${th} text-right`}>Net earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.courses.map((c) => (
                    <tr key={c.courseId}>
                      <td className={td}>
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-muted capitalize">{c.status}</p>
                      </td>
                      <td className={`${td} text-right`}>{c.students}</td>
                      <td className={`${td} text-right`}>{c.sales}</td>
                      <td className={`${td} text-right`}>{formatMoney(c.grossRevenue)}</td>
                      <td className={`${td} text-right`}>{formatMoney(c.lmsShare)}</td>
                      <td className={`${td} text-right`}>{formatMoney(c.teacherShare)}</td>
                      <td className={`${td} text-right text-danger-600`}>{formatMoney(c.refunds)}</td>
                      <td className={`${td} text-right font-semibold text-secondary-600`}>{formatMoney(c.netEarnings)}</td>
                    </tr>
                  ))}
                  {data.courses.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">
                        You don't have any courses yet.
                      </td>
                    </tr>
                  )}
                </tbody>
                {data.courses.length > 0 && (
                  <tfoot className="bg-surface-strong/60">
                    <tr>
                      <td className={`${td} font-semibold`}>Total</td>
                      <td className={td} />
                      <td className={`${td} text-right font-semibold`}>{data.totals.sales}</td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(data.totals.grossRevenue)}</td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(data.totals.lmsShare)}</td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(data.totals.teacherShare)}</td>
                      <td className={`${td} text-right font-semibold text-danger-600`}>{formatMoney(data.totals.refunds)}</td>
                      <td className={`${td} text-right font-semibold text-secondary-600`}>{formatMoney(data.totals.netEarnings)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          <p className="text-xs text-muted mt-3">
            LMS share and your share are before refunds. Net earnings = your share − your portion of refunds. A refund is counted in the
            period when it was issued. "Students" is the number of different students who bought the course in the period.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}