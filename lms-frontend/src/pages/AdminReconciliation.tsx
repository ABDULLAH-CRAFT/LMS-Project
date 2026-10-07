import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { adminSidebarSections } from '../config/adminSidebar';
import { formatDateTime, formatMoney } from '../lib/financeFormat';
import {
  explainTeacher,
  getAuditTrail,
  getEngagementBreakdown,
  getPaymentTrace,
  getReconciliationOverview,
  getReconciliationRun,
  getTeacherCourseLines,
  listReconciliationRuns,
  listReconciliationTeachers,
  runReconciliation,
} from '../lib/api/reconciliation';
import type { AuditCategory, CheckResult, ReconciliationTie } from '../types/reconciliation';

const PAGE_SIZE = 20;
const th = 'px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap text-left';
const td = 'px-3 py-2 text-sm text-text';
const card = 'bg-surface rounded-2xl shadow-soft';
const input = 'rounded-xl border border-border bg-background px-3 py-2 text-sm text-text';
const primaryButton =
  'bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-40';
const smallButton = 'px-3 py-1 rounded-full border border-border text-xs font-medium text-text hover:bg-surface-strong/60 disabled:opacity-40';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? error.message;
  }
  return 'Something went wrong';
}

function Pill({ tone, children }: { tone: 'good' | 'warn' | 'bad' | 'neutral'; children: React.ReactNode }) {
  const style = {
    good: 'bg-secondary-100 text-secondary-700',
    warn: 'bg-warning-bg text-warning',
    bad: 'bg-danger-100 text-danger-700',
    neutral: 'bg-surface-strong text-muted',
  }[tone];
  return <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${style}`}>{children}</span>;
}

function Pager({ offset, total, onChange }: { offset: number; total: number; onChange: (next: number) => void }) {
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted">
      <span>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
      <div className="flex gap-2">
        <button disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - PAGE_SIZE))} className={smallButton}>Previous</button>
        <button disabled={offset + PAGE_SIZE >= total} onClick={() => onChange(offset + PAGE_SIZE)} className={smallButton}>Next</button>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${card} max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-text">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-text text-sm">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ───────────────────────── shared: check list ─────────────────────────

function CheckList({ checks }: { checks: CheckResult[] }) {
  return (
    <div className="space-y-3">
      {checks.map((c) => (
        <div key={c.code} className={`${card} p-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-text">{c.title}</p>
            {c.status === 'PASS' ? (
              <Pill tone="good">Pass</Pill>
            ) : (
              <Pill tone={c.severity === 'CRITICAL' ? 'bad' : 'warn'}>
                {c.count} {c.severity === 'CRITICAL' ? 'critical' : 'warning'} issue{c.count === 1 ? '' : 's'}
              </Pill>
            )}
            <span className="text-[11px] text-muted font-mono">{c.code}</span>
          </div>
          <p className="text-xs text-muted mt-1">{c.description}</p>

          {c.status === 'FAIL' && (
            <div className="overflow-x-auto rounded-xl border border-border mt-3">
              <table className="w-full">
                <thead className="bg-surface-strong/60">
                  <tr>
                    <th className={th}>Reference</th>
                    <th className={th}>What is wrong</th>
                    <th className={`${th} text-right`}>Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {c.samples.map((s, i) => (
                    <tr key={`${s.reference}-${i}`}>
                      <td className={`${td} font-mono text-xs`}>{s.reference}</td>
                      <td className={td}>{s.detail}</td>
                      <td className={`${td} text-right`}>{s.amount !== null ? formatMoney(s.amount) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {c.count > c.samples.length && (
                <p className="text-xs text-muted px-3 py-2 border-t border-border">Showing the first {c.samples.length} of {c.count}.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Ties({ ties }: { ties: ReconciliationTie[] }) {
  return (
    <div className={`${card} p-4`}>
      <p className="font-semibold text-text mb-3">Cross-system totals</p>
      <div className="space-y-3">
        {ties.map((t) => (
          <div key={t.label} className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <p className="text-text font-medium">{t.label}</p>
              <p className="text-xs text-muted">
                {t.leftLabel}: {formatMoney(t.left)} · {t.rightLabel}: {formatMoney(t.right)}
              </p>
            </div>
            <Pill tone={t.matches ? 'good' : 'bad'}>{t.matches ? 'Matches' : 'Does not match'}</Pill>
          </div>
        ))}
      </div>
    </div>
  );
}

const FIGURE_LABELS: [string, string][] = [
  ['paymentsTotal', 'Paid payments (course + membership)'],
  ['ledgerGross', 'Ledger gross'],
  ['ledgerReversals', 'Refunds + chargebacks'],
  ['platformCourse', 'Platform share (course)'],
  ['teacherCourse', 'Teacher share (course, net)'],
  ['platformMembership', 'Platform share (membership, finalized)'],
  ['teacherMembership', 'Teacher share (membership, finalized)'],
  ['teacherEarnings', 'Total teacher earnings'],
  ['payoutsPaid', 'Payouts paid'],
  ['payoutsInFlight', 'Payouts in progress'],
  ['teacherUnpaid', 'Still to request / pay'],
];

function Figures({ figures }: { figures: Record<string, string> }) {
  return (
    <div className={`${card} p-4`}>
      <p className="font-semibold text-text mb-3">Money at each stage</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
        {FIGURE_LABELS.map(([key, label]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-muted">{label}</span>
            <span className="font-semibold text-text">{figures[key] !== undefined ? formatMoney(figures[key]) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── tab: checks ─────────────────────────

function ChecksTab() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['reconciliation-overview'], queryFn: getReconciliationOverview });
  const run = useMutation({
    mutationFn: runReconciliation,
    onSuccess: (data) => {
      queryClient.setQueryData(['reconciliation-overview'], data);
      queryClient.invalidateQueries({ queryKey: ['reconciliation-runs'] });
    },
  });
  const o = query.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => query.refetch()} disabled={query.isFetching} className={smallButton}>
          {query.isFetching ? 'Checking...' : 'Re-check now'}
        </button>
        <button onClick={() => run.mutate()} disabled={run.isPending} className={primaryButton}>
          {run.isPending ? 'Saving...' : 'Run & save snapshot'}
        </button>
        {run.isError && <span className="text-xs text-danger-600">{errorMessage(run.error)}</span>}
        {run.isSuccess && <span className="text-xs text-muted">Snapshot saved.</span>}
      </div>

      {query.isLoading && <p className="text-sm text-muted">Running checks...</p>}
      {query.isError && <p className="text-sm text-danger-600">{errorMessage(query.error)}</p>}

      {o && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`${card} p-4`}>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">Overall</p>
              <div className="mt-2">
                <Pill tone={o.status === 'HEALTHY' ? 'good' : o.status === 'WARNINGS' ? 'warn' : 'bad'}>
                  {o.status === 'HEALTHY' ? 'All clear' : o.status === 'WARNINGS' ? 'Warnings only' : 'Needs attention'}
                </Pill>
              </div>
              <p className="text-xs text-muted mt-2">{formatDateTime(o.ranAt)}</p>
            </div>
            <div className={`${card} p-4`}>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">Checks passed</p>
              <p className="text-xl font-bold text-text mt-1">{o.summary.passedCount} / {o.summary.checkCount}</p>
            </div>
            <div className={`${card} p-4`}>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">Critical issues</p>
              <p className="text-xl font-bold text-text mt-1">{o.summary.criticalIssues}</p>
            </div>
            <div className={`${card} p-4`}>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">Warnings</p>
              <p className="text-xl font-bold text-text mt-1">{o.summary.warningIssues}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Ties ties={o.ties} />
            <Figures figures={o.figures} />
          </div>

          <CheckList checks={[...o.checks].sort((a, b) => Number(b.status === 'FAIL') - Number(a.status === 'FAIL'))} />
        </>
      )}
    </div>
  );
}

// ───────────────────────── tab: teacher trace ─────────────────────────

function EngagementModal({ teacherId, periodId, onClose }: { teacherId: string; periodId: string; onClose: () => void }) {
  const query = useQuery({ queryKey: ['recon-engagement', teacherId, periodId], queryFn: () => getEngagementBreakdown(teacherId, periodId) });
  const d = query.data;

  return (
    <Modal title="Why this membership amount" onClose={onClose}>
      {query.isLoading && <p className="text-sm text-muted">Loading...</p>}
      {query.isError && <p className="text-sm text-danger-600">{errorMessage(query.error)}</p>}
      {d && (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            {d.teacher.name} · period {d.period.periodStart} to {d.period.periodEnd} · calculation run #{d.calculation.runNumber}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Eligible revenue', formatMoney(d.calculation.eligibleRevenue)],
              [`Teacher pool (${d.calculation.teacherPercentage}%)`, formatMoney(d.calculation.teacherPool)],
              ['Pool share', `${d.allocation.poolSharePercent}%`],
              ['Teacher earned', formatMoney(d.allocation.amount)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted">{label}</p>
                <p className="text-lg font-bold text-text">{value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full">
              <thead className="bg-surface-strong/60">
                <tr>
                  <th className={th}>Category</th>
                  <th className={`${th} text-right`}>Raw activity</th>
                  <th className={`${th} text-right`}>Category score</th>
                  <th className={`${th} text-right`}>Weight</th>
                  <th className={`${th} text-right`}>Adds to final</th>
                  <th className={`${th} text-right`}>Share of final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.engagement.categories.map((c) => (
                  <tr key={c.key}>
                    <td className={td}>{c.label}</td>
                    <td className={`${td} text-right`}>{c.rawMetric}</td>
                    <td className={`${td} text-right`}>{c.categoryScore}</td>
                    <td className={`${td} text-right`}>{c.weightPercent}%</td>
                    <td className={`${td} text-right`}>{c.contribution}</td>
                    <td className={`${td} text-right`}>{c.shareOfFinalPercent}%</td>
                  </tr>
                ))}
                <tr className="bg-surface-strong/40">
                  <td className={`${td} font-semibold`} colSpan={4}>Final engagement score</td>
                  <td className={`${td} text-right font-semibold`}>{d.engagement.finalScore}</td>
                  <td className={td}></td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted">
            {d.engagement.teachersInRun} teachers scored in this run (combined score {d.engagement.runTotalScore}); {d.engagement.activeLearners} active learners.{' '}
            {d.engagement.scoreVerified ? (
              <span className="text-secondary-700 font-medium">Final score re-derived from the stored category scores and weights: verified.</span>
            ) : (
              <span className="text-danger-700 font-medium">The stored final score does not match the re-derived value. Investigate.</span>
            )}
          </p>
        </div>
      )}
    </Modal>
  );
}

function TeacherTab() {
  const [teacherId, setTeacherId] = useState('');
  const [offset, setOffset] = useState(0);
  const [periodId, setPeriodId] = useState<string | null>(null);

  const teachers = useQuery({ queryKey: ['recon-teachers'], queryFn: listReconciliationTeachers });
  const explain = useQuery({
    queryKey: ['recon-explain', teacherId],
    queryFn: () => explainTeacher(teacherId),
    enabled: !!teacherId,
  });
  const lines = useQuery({
    queryKey: ['recon-lines', teacherId, offset],
    queryFn: () => getTeacherCourseLines(teacherId, PAGE_SIZE, offset),
    enabled: !!teacherId,
    placeholderData: keepPreviousData,
  });
  const e = explain.data;

  return (
    <div className="space-y-5">
      <div>
        <select
          value={teacherId}
          onChange={(ev) => { setTeacherId(ev.target.value); setOffset(0); }}
          className={`${input} min-w-[260px]`}
        >
          <option value="">Choose a teacher...</option>
          {teachers.data?.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
          ))}
        </select>
      </div>

      {!teacherId && <p className="text-sm text-muted">Pick a teacher to see exactly how their earnings were built.</p>}
      {explain.isLoading && teacherId && <p className="text-sm text-muted">Loading...</p>}
      {explain.isError && <p className="text-sm text-danger-600">{errorMessage(explain.error)}</p>}

      {e && (
        <>
          <div className={`${card} p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <p className="font-semibold text-text">Why {e.teacher.name} earned {formatMoney(e.net)}</p>
              <Pill tone={e.reconciles ? 'good' : 'bad'}>{e.reconciles ? 'Ledger = balance' : 'Ledger ≠ balance'}</Pill>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Course sales earned ({e.courseSales.sales} sales)</span><span className="text-text">{formatMoney(e.courseSales.earned)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Refund / chargeback adjustments ({e.courseSales.reversals})</span><span className="text-text">{formatMoney(e.courseSales.refundAdjustments)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Membership pool earnings ({e.membership.periods.length} period{e.membership.periods.length === 1 ? '' : 's'})</span><span className="text-text">{formatMoney(e.membership.total)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold"><span className="text-text">Net earnings</span><span className="text-text">{formatMoney(e.net)}</span></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                ['Pending (hold)', e.balance.pendingEarnings],
                ['Available', e.balance.availableBalance],
                ['In payout', e.balance.processingBalance],
                ['Paid', e.balance.paidBalance],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted">{label}</p>
                  <p className="text-lg font-bold text-text">{formatMoney(value)}</p>
                </div>
              ))}
            </div>
            {e.payouts.length > 0 && (
              <p className="text-xs text-muted mt-3">
                Payouts: {e.payouts.map((p) => `${p.count} ${p.status.toLowerCase()} (${formatMoney(p.amount)})`).join(' · ')}
              </p>
            )}
          </div>

          <div className={`${card} overflow-hidden`}>
            <p className="font-semibold text-text px-4 pt-4">Membership periods</p>
            <div className="overflow-x-auto">
              <table className="w-full mt-2">
                <thead className="bg-surface-strong/60">
                  <tr>
                    <th className={th}>Period</th>
                    <th className={th}>Status</th>
                    <th className={`${th} text-right`}>Teacher pool</th>
                    <th className={`${th} text-right`}>Score</th>
                    <th className={`${th} text-right`}>Pool share</th>
                    <th className={`${th} text-right`}>Earned</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {e.membership.periods.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-3 text-sm text-muted">No finalized membership periods for this teacher yet.</td></tr>
                  )}
                  {e.membership.periods.map((p) => (
                    <tr key={p.periodId}>
                      <td className={td}>{p.periodStart} → {p.periodEnd}</td>
                      <td className={td}><Pill tone="neutral">{p.status}</Pill></td>
                      <td className={`${td} text-right`}>{formatMoney(p.teacherPool)}</td>
                      <td className={`${td} text-right`}>{p.finalScore}</td>
                      <td className={`${td} text-right`}>{p.poolSharePercent}%</td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(p.amount)}</td>
                      <td className={td}><button onClick={() => setPeriodId(p.periodId)} className={smallButton}>Why?</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${card} overflow-hidden`}>
            <p className="font-semibold text-text px-4 pt-4">Course revenue lines</p>
            {lines.isLoading && <p className="text-sm text-muted p-4">Loading lines...</p>}
            {lines.data && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full mt-2">
                    <thead className="bg-surface-strong/60">
                      <tr>
                        <th className={th}>Date</th>
                        <th className={th}>Type</th>
                        <th className={th}>Course</th>
                        <th className={th}>Student</th>
                        <th className={`${th} text-right`}>Transaction</th>
                        <th className={`${th} text-right`}>Teacher %</th>
                        <th className={`${th} text-right`}>Teacher amount</th>
                        <th className={th}>Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {lines.data.lines.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-3 text-sm text-muted">No course revenue yet.</td></tr>
                      )}
                      {lines.data.lines.map((l) => (
                        <tr key={l.id}>
                          <td className={`${td} whitespace-nowrap`}>{formatDateTime(l.occurredAt)}</td>
                          <td className={td}><Pill tone={l.type === 'COURSE_PURCHASE' ? 'good' : 'bad'}>{l.type.replace('_', ' ')}</Pill></td>
                          <td className={td}>{l.courseTitle ?? '—'}</td>
                          <td className={td}>{l.studentName ?? '—'}</td>
                          <td className={`${td} text-right`}>{formatMoney(l.transactionAmount)}</td>
                          <td className={`${td} text-right`}>{l.percentage}%</td>
                          <td className={`${td} text-right font-semibold`}>{formatMoney(l.teacherAmount)}</td>
                          <td className={td}>{l.payoutStatus ? <Pill tone="neutral">{l.payoutStatus}</Pill> : <span className="text-muted text-xs">not in a payout</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager offset={offset} total={lines.data.paging.total} onChange={setOffset} />
              </>
            )}
          </div>
        </>
      )}

      {periodId && teacherId && <EngagementModal teacherId={teacherId} periodId={periodId} onClose={() => setPeriodId(null)} />}
    </div>
  );
}

// ───────────────────────── tab: payment trace ─────────────────────────

function PaymentTab() {
  const [text, setText] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const valid = UUID_RE.test(text.trim());

  const query = useQuery({
    queryKey: ['recon-payment', paymentId],
    queryFn: () => getPaymentTrace(paymentId),
    enabled: !!paymentId,
    retry: false,
  });
  const t = query.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <input
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          placeholder="Payment id (UUID)"
          className={`${input} w-full max-w-md font-mono`}
        />
        <button disabled={!valid} onClick={() => setPaymentId(text.trim())} className={primaryButton}>Trace</button>
      </div>
      {text.length > 0 && !valid && <p className="text-xs text-muted">That is not a valid payment id.</p>}
      {query.isFetching && <p className="text-sm text-muted">Tracing...</p>}
      {query.isError && <p className="text-sm text-danger-600">{errorMessage(query.error)}</p>}

      {t && (
        <div className="space-y-4">
          <div className={`${card} p-5`}>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <p className="font-semibold text-text">{formatMoney(t.payment.amount)}</p>
              <Pill tone={t.payment.status === 'paid' ? 'good' : 'neutral'}>{t.payment.status}</Pill>
              {t.settlement ? <Pill tone="good">Settled {formatDateTime(t.settlement.settledAt)}</Pill> : <Pill tone={t.payment.status === 'paid' ? 'bad' : 'neutral'}>Not settled</Pill>}
              {t.flags.itemsMissingRevenue > 0 && <Pill tone="bad">{t.flags.itemsMissingRevenue} item(s) missing revenue</Pill>}
              {!t.flags.paymentAmountMatchesItems && <Pill tone="bad">Items do not add up to the payment</Pill>}
            </div>
            <p className="text-sm text-muted">
              {t.payment.studentName ?? 'Unknown student'} {t.payment.studentEmail ? `· ${t.payment.studentEmail}` : ''} · {formatDateTime(t.payment.createdAt)}
            </p>
            <p className="text-xs text-muted mt-1 font-mono">order {t.payment.providerOrderId} · payment {t.payment.providerPaymentId ?? '—'}</p>
          </div>

          {t.items.map((item) => (
            <div key={item.id} className={`${card} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-text">{item.label ?? item.referenceType}</p>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-text">{formatMoney(item.lineTotal)}</span>
                  {item.needsRevenue && !item.hasRevenue && <Pill tone="bad">No revenue transaction</Pill>}
                </div>
              </div>
              <p className="text-xs text-muted mt-1">{item.referenceType} · net on ledger {formatMoney(item.netLedgerAmount)}</p>

              {item.ledger.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-border mt-3">
                  <table className="w-full">
                    <thead className="bg-surface-strong/60">
                      <tr>
                        <th className={th}>Ledger row</th>
                        <th className={`${th} text-right`}>Amount</th>
                        <th className={th}>Allocations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {item.ledger.map((l) => (
                        <tr key={l.id}>
                          <td className={td}>
                            <Pill tone={l.amount.startsWith('-') ? 'bad' : 'good'}>{l.type.replace('_', ' ')}</Pill>
                            <span className="block text-[11px] text-muted mt-1">{formatDateTime(l.occurredAt)}</span>
                          </td>
                          <td className={`${td} text-right`}>{formatMoney(l.amount)}</td>
                          <td className={td}>
                            {l.allocations.length === 0 ? (
                              <span className="text-xs text-muted">{l.type === 'MEMBERSHIP_PAYMENT' ? 'Pooled into a revenue period' : 'none'}</span>
                            ) : (
                              l.allocations.map((a) => (
                                <p key={a.id} className="text-xs">
                                  {a.recipientType === 'PLATFORM' ? 'Platform' : a.recipientName ?? 'Teacher'} · {a.percentage}% · {formatMoney(a.amount)}
                                  {a.payoutStatus && <span className="text-muted"> · payout {a.payoutStatus.toLowerCase()}</span>}
                                </p>
                              ))
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {item.subscriptionPayment && (
                <p className="text-xs text-muted mt-3">
                  Subscription {item.subscriptionPayment.status.toLowerCase()} · paid access {formatDateTime(item.subscriptionPayment.periodStart)} → {formatDateTime(item.subscriptionPayment.periodEnd)}
                </p>
              )}
            </div>
          ))}

          {t.refunds.length > 0 && (
            <div className={`${card} p-5`}>
              <p className="font-semibold text-text mb-2">Refunds and chargebacks</p>
              {t.refunds.map((r) => (
                <p key={r.id} className="text-sm text-text">
                  {r.kind} · {formatMoney(r.amount)} · {formatDateTime(r.occurredAt)}
                  {r.reason && <span className="text-muted"> · {r.reason}</span>}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── tab: audit trail ─────────────────────────

const CATEGORY_FILTERS: { key: 'ALL' | AuditCategory; label: string }[] = [
  { key: 'ALL', label: 'Everything' },
  { key: 'PAYOUT', label: 'Payouts' },
  { key: 'PERIOD', label: 'Revenue periods' },
  { key: 'REFUND', label: 'Refunds' },
  { key: 'CONFIG', label: 'Configuration' },
];

function AuditTab() {
  const [category, setCategory] = useState<'ALL' | AuditCategory>('ALL');
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ['recon-audit', category, offset],
    queryFn: () => getAuditTrail({ category: category === 'ALL' ? undefined : category, limit: PAGE_SIZE, offset }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c.key}
            onClick={() => { setCategory(c.key); setOffset(0); }}
            className={['px-4 py-1.5 rounded-full text-sm font-medium transition', category === c.key ? 'bg-primary-600 text-white' : 'bg-surface text-muted hover:bg-surface-strong/60'].join(' ')}
          >
            {c.label}
          </button>
        ))}
      </div>

      {query.isLoading && <p className="text-sm text-muted">Loading...</p>}
      {query.isError && <p className="text-sm text-danger-600">{errorMessage(query.error)}</p>}

      {query.data && (
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-strong/60">
                <tr>
                  <th className={th}>When</th>
                  <th className={th}>Area</th>
                  <th className={th}>Action</th>
                  <th className={th}>By</th>
                  <th className={th}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {query.data.events.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-3 text-sm text-muted">Nothing recorded yet.</td></tr>
                )}
                {query.data.events.map((ev, i) => (
                  <tr key={`${ev.reference}-${ev.occurredAt}-${i}`}>
                    <td className={`${td} whitespace-nowrap`}>{formatDateTime(ev.occurredAt)}</td>
                    <td className={td}><Pill tone="neutral">{ev.category}</Pill></td>
                    <td className={`${td} whitespace-nowrap`}>{ev.action}</td>
                    <td className={`${td} whitespace-nowrap`}>{ev.actorName ?? <span className="text-muted">System / automatic</span>}</td>
                    <td className={`${td} text-xs text-muted`}>{ev.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager offset={offset} total={query.data.paging.total} onChange={setOffset} />
        </div>
      )}
    </div>
  );
}

// ───────────────────────── tab: run history ─────────────────────────

function HistoryTab() {
  const [openId, setOpenId] = useState<string | null>(null);
  const runs = useQuery({ queryKey: ['reconciliation-runs'], queryFn: listReconciliationRuns });
  const detail = useQuery({
    queryKey: ['reconciliation-run', openId],
    queryFn: () => getReconciliationRun(openId as string),
    enabled: !!openId,
  });

  return (
    <div className="space-y-4">
      {runs.isLoading && <p className="text-sm text-muted">Loading...</p>}
      {runs.isError && <p className="text-sm text-danger-600">{errorMessage(runs.error)}</p>}
      {runs.data && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-left">
            <thead className="bg-surface-strong/60">
              <tr>
                <th className={th}>Run at</th>
                <th className={th}>Run by</th>
                <th className={`${th} text-right`}>Failed checks</th>
                <th className={`${th} text-right`}>Critical</th>
                <th className={`${th} text-right`}>Warnings</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-3 text-sm text-muted">No snapshots yet. Use "Run &amp; save snapshot" on the Checks tab.</td></tr>
              )}
              {runs.data.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} whitespace-nowrap`}>{formatDateTime(r.ranAt)}</td>
                  <td className={td}>{r.ranByName ?? '—'}</td>
                  <td className={`${td} text-right`}>{r.failedCount} / {r.checkCount}</td>
                  <td className={`${td} text-right`}>{r.criticalIssues}</td>
                  <td className={`${td} text-right`}>{r.warningIssues}</td>
                  <td className={td}><button onClick={() => setOpenId(r.id)} className={smallButton}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId && (
        <Modal title="Saved snapshot" onClose={() => setOpenId(null)}>
          {detail.isLoading && <p className="text-sm text-muted">Loading...</p>}
          {detail.isError && <p className="text-sm text-danger-600">{errorMessage(detail.error)}</p>}
          {detail.data && (
            <div className="space-y-4">
              <p className="text-sm text-muted">{formatDateTime(detail.data.ranAt)} · run by {detail.data.ranByName ?? '—'}</p>
              <CheckList checks={detail.data.checks} />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ───────────────────────── page ─────────────────────────

const TABS = [
  { key: 'checks', label: 'Checks' },
  { key: 'teacher', label: 'Teacher trace' },
  { key: 'payment', label: 'Payment trace' },
  { key: 'audit', label: 'Audit trail' },
  { key: 'history', label: 'Run history' },
] as const;

export default function AdminReconciliation() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('checks');

  return (
    <DashboardLayout sidebarSections={adminSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Audit &amp; Reconciliation</h1>
      <p className="text-muted mb-6">
        Prove that every rupee ties out: payments, ledger, allocations, teacher balances and payouts. Nothing on this page can change a financial record.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={['px-4 py-1.5 rounded-full text-sm font-medium transition', tab === t.key ? 'bg-primary-600 text-white' : 'bg-surface text-muted hover:bg-surface-strong/60'].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-6xl">
        {tab === 'checks' && <ChecksTab />}
        {tab === 'teacher' && <TeacherTab />}
        {tab === 'payment' && <PaymentTab />}
        {tab === 'audit' && <AuditTab />}
        {tab === 'history' && <HistoryTab />}
      </div>
    </DashboardLayout>
  );
}