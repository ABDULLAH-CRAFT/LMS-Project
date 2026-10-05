import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import PayoutDetailModal from '../components/finance/PayoutDetailModal';
import PayoutStatusBadge, { payoutStatusLabel } from '../components/finance/PayoutStatusBadge';
import { adminSidebarSections } from '../config/adminSidebar';
import {
  approvePayout,
  getAdminBalances,
  getAdminTeacherStatement,
  getPayoutSettings,
  listAdminPayouts,
  markPayoutFailed,
  markPayoutPaid,
  rejectPayout,
  retryPayout,
  reversePayout,
  startPayoutProcessing,
  updatePayoutSettings,
} from '../lib/api/payouts';
import { formatDateTime, formatMoney } from '../lib/financeFormat';
import type { PayoutRow, PayoutStatus } from '../types/payouts';

const PAGE_SIZE = 20;
const th = 'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap text-left';
const td = 'px-4 py-3 text-sm text-text whitespace-nowrap';
const input = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text';
const primaryButton =
  'bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-40';
const smallButton = 'px-3 py-1 rounded-full border border-border text-xs font-medium text-text hover:bg-surface-strong/60 disabled:opacity-40';

const STATUS_FILTERS: ('ALL' | PayoutStatus)[] = ['PENDING', 'APPROVED', 'PROCESSING', 'FAILED', 'PAID', 'REJECTED', 'REVERSED', 'ALL'];

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? error.message;
  }
  return 'Something went wrong';
}

function askText(label: string): string | null {
  const value = window.prompt(label);
  if (!value || value.trim().length < 3) return null;
  return value.trim();
}

// ───────────────────────── requests tab ─────────────────────────

function RequestsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'ALL' | PayoutStatus>('PENDING');
  const [offset, setOffset] = useState(0);

  const query = useQuery({
    queryKey: ['admin-payouts', status, offset],
    queryFn: () => listAdminPayouts({ status: status === 'ALL' ? undefined : status, limit: PAGE_SIZE, offset }),
    placeholderData: keepPreviousData,
  });

  const run = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payout-balances'] });
      queryClient.invalidateQueries({ queryKey: ['payout-detail'] });
    },
    onError: (error) => window.alert(errorMessage(error)),
  });

  const data = query.data;
  const total = data?.paging.total ?? 0;

  const actions = (p: PayoutRow) => {
    const btn = (label: string, onClick: () => void) => (
      <button key={label} disabled={run.isPending} onClick={onClick} className={smallButton}>{label}</button>
    );
    const cancelWithReason = (label: string, prompt: string) =>
      btn(label, () => {
        const reason = askText(prompt);
        if (reason) run.mutate(() => rejectPayout(p.id, reason));
      });

    switch (p.status) {
      case 'PENDING':
        return [
          btn('Approve', () => {
            if (window.confirm(`Approve ${formatMoney(p.amount)} for ${p.teacher?.name}?`)) run.mutate(() => approvePayout(p.id));
          }),
          cancelWithReason('Reject', 'Reason for rejecting this payout (the teacher can see it):'),
        ];
      case 'APPROVED':
        return [
          btn('Start processing', () => run.mutate(() => startPayoutProcessing(p.id))),
          cancelWithReason('Reject', 'Reason for rejecting this payout (the teacher can see it):'),
        ];
      case 'PROCESSING':
        return [
          btn('Mark paid', () => {
            const ref = askText('Bank / UTR reference of the transfer:');
            if (ref) run.mutate(() => markPayoutPaid(p.id, ref));
          }),
          btn('Mark failed', () => {
            const reason = askText('Why did the transfer fail? (the teacher can see it)');
            if (reason) run.mutate(() => markPayoutFailed(p.id, reason));
          }),
        ];
      case 'FAILED':
        return [
          btn('Retry', () => run.mutate(() => retryPayout(p.id))),
          cancelWithReason('Cancel', 'Reason for cancelling this failed payout (the money returns to the teacher\'s available balance):'),
        ];
      case 'PAID':
        return [
          btn('Reverse', () => {
            const reason = askText('Why is this payout being reversed (e.g. the bank returned the money)?');
            if (reason && window.confirm('Reverse this payout? The lines return to the teacher\'s available balance.')) {
              run.mutate(() => reversePayout(p.id, reason));
            }
          }),
        ];
      default:
        return [];
    }
  };

  return (
    <>
      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {data.summary.map((s) => (
            <div key={s.status} className="bg-surface rounded-2xl shadow-soft p-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">{payoutStatusLabel(s.status)}</p>
              <p className="text-xl font-bold text-text mt-1">{formatMoney(s.amount)}</p>
              <p className="text-xs text-muted mt-1">{s.count} payout{s.count === 1 ? '' : 's'}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setOffset(0); }}
            className={['px-4 py-1.5 rounded-full text-sm font-medium transition', status === s ? 'bg-primary-600 text-white' : 'bg-surface text-muted hover:bg-surface-strong/60'].join(' ')}
          >
            {s === 'ALL' ? 'All' : payoutStatusLabel(s)}
          </button>
        ))}
      </div>

      {query.isLoading && <p className="text-sm text-muted">Loading payouts...</p>}
      {query.isError && <p className="text-sm text-danger-600">{errorMessage(query.error)}</p>}

      {data && (
        <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
          {data.payouts.length === 0 ? (
            <p className="text-sm text-muted p-4">No payouts with this status.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-strong/60">
                  <tr>
                    <th className={th}>Requested</th>
                    <th className={th}>Teacher</th>
                    <th className={`${th} text-right`}>Amount</th>
                    <th className={`${th} text-right`}>Lines</th>
                    <th className={th}>Status</th>
                    <th className={th}>Bank ref</th>
                    <th className={th}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.payouts.map((p) => (
                    <tr key={p.id}>
                      <td className={td}>{formatDateTime(p.requestedAt)}</td>
                      <td className={td}>
                        {p.teacher?.name}
                        <span className="block text-[11px] text-muted">{p.teacher?.email}</span>
                      </td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(p.amount)}</td>
                      <td className={`${td} text-right`}>{p.itemCount}</td>
                      <td className={td}>
                        <PayoutStatusBadge status={p.status} />
                        {(p.retryCount ?? 0) > 0 && <span className="text-[11px] text-muted ml-2">retry ×{p.retryCount}</span>}
                      </td>
                      <td className={`${td} font-mono text-xs`}>{p.providerPayoutId ?? '—'}</td>
                      <td className={td}>
                        <div className="flex gap-2">
                          <button onClick={() => onOpen(p.id)} className={smallButton}>Details</button>
                          {actions(p)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted">
              <span>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
              <div className="flex gap-2">
                <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className={smallButton}>Previous</button>
                <button disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} className={smallButton}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ───────────────────────── teacher statement modal ─────────────────────────

function TeacherStatementModal({ teacherId, onClose, onOpenPayout }: { teacherId: string; onClose: () => void; onOpenPayout: (id: string) => void }) {
  const query = useQuery({ queryKey: ['admin-teacher-statement', teacherId], queryFn: () => getAdminTeacherStatement(teacherId) });
  const s = query.data;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-soft max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text">Payout statement</h2>
            {s && <p className="text-sm text-muted mt-1">{s.teacher.name} · {s.teacher.email}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-text text-sm">Close</button>
        </div>

        {query.isLoading && <p className="text-sm text-muted">Loading statement...</p>}
        {query.isError && <p className="text-sm text-danger-600">{errorMessage(query.error)}</p>}

        {s && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Pending (hold)', s.balance.balances.pendingEarnings],
                ['Available', s.balance.balances.availableBalance],
                ['In payout', s.balance.balances.processingBalance],
                ['Paid', s.balance.balances.paidBalance],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted">{label}</p>
                  <p className="text-lg font-bold text-text">{formatMoney(value)}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted">
              Lifetime net {formatMoney(s.balance.balances.lifetimeNet)} · refund adjustments {formatMoney(s.balance.balances.adjustmentBalance)} (already included).
            </p>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full">
                <thead className="bg-surface-strong/60">
                  <tr>
                    <th className={th}>Requested</th>
                    <th className={`${th} text-right`}>Amount</th>
                    <th className={th}>Status</th>
                    <th className={th}>Paid on</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {s.payouts.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-3 text-sm text-muted">No payouts yet.</td></tr>
                  )}
                  {s.payouts.map((p) => (
                    <tr key={p.id}>
                      <td className={td}>{formatDateTime(p.requestedAt)}</td>
                      <td className={`${td} text-right`}>{formatMoney(p.amount)}</td>
                      <td className={td}><PayoutStatusBadge status={p.status} /></td>
                      <td className={td}>{p.paidAt ? formatDateTime(p.paidAt) : '—'}</td>
                      <td className={td}><button onClick={() => onOpenPayout(p.id)} className={smallButton}>Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── balances tab ─────────────────────────

function BalancesTab({ onOpenPayout }: { onOpenPayout: (id: string) => void }) {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['admin-payout-balances'], queryFn: getAdminBalances });
  const data = query.data;

  return (
    <>
      {query.isLoading && <p className="text-sm text-muted">Loading balances...</p>}
      {query.isError && <p className="text-sm text-danger-600">{errorMessage(query.error)}</p>}
      {data && (
        <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
          <p className="text-xs text-muted px-4 py-3 border-b border-border">
            Course earnings are held for {data.settings.holdDays} days. Minimum payout {formatMoney(data.settings.minimumPayout)}.
          </p>
          {data.teachers.length === 0 ? (
            <p className="text-sm text-muted p-4">No teacher has earnings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-strong/60">
                  <tr>
                    <th className={th}>Teacher</th>
                    <th className={`${th} text-right`}>Pending (hold)</th>
                    <th className={`${th} text-right`}>Available</th>
                    <th className={`${th} text-right`}>In payout</th>
                    <th className={`${th} text-right`}>Paid</th>
                    <th className={`${th} text-right`}>Refund adj.</th>
                    <th className={th}>Request</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.teachers.map((t) => (
                    <tr key={t.teacherId}>
                      <td className={td}>
                        {t.teacherName}
                        <span className="block text-[11px] text-muted">{t.teacherEmail}</span>
                      </td>
                      <td className={`${td} text-right`}>{formatMoney(t.balances.pendingEarnings)}</td>
                      <td className={`${td} text-right font-semibold ${Number(t.balances.availableBalance) < 0 ? 'text-danger-600' : ''}`}>{formatMoney(t.balances.availableBalance)}</td>
                      <td className={`${td} text-right`}>{formatMoney(t.balances.processingBalance)}</td>
                      <td className={`${td} text-right`}>{formatMoney(t.balances.paidBalance)}</td>
                      <td className={`${td} text-right text-danger-600`}>{formatMoney(t.balances.adjustmentBalance)}</td>
                      <td className={`${td} text-xs text-muted`}>{t.openRequests > 0 ? 'Waiting' : t.canRequest ? 'Can request' : '—'}</td>
                      <td className={td}><button onClick={() => setTeacherId(t.teacherId)} className={smallButton}>Statement</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {teacherId && <TeacherStatementModal teacherId={teacherId} onClose={() => setTeacherId(null)} onOpenPayout={onOpenPayout} />}
    </>
  );
}

// ───────────────────────── settings tab ─────────────────────────

function SettingsTab() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-payout-settings'], queryFn: getPayoutSettings });
  const [holdDays, setHoldDays] = useState('');
  const [minimum, setMinimum] = useState('');
  const [note, setNote] = useState('');

  const save = useMutation({
    mutationFn: () => updatePayoutSettings({ holdDays: Number(holdDays), minimumPayout: minimum, note: note || undefined }),
    onSuccess: () => {
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['admin-payout-settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payout-balances'] });
    },
  });

  const current = query.data?.current;
  const valid = holdDays !== '' && Number.isInteger(Number(holdDays)) && Number(holdDays) >= 0 && Number(holdDays) <= 90 && /^\d{1,10}(\.\d{1,2})?$/.test(minimum);

  return (
    <div className="space-y-5 max-w-3xl">
      {current && (
        <div className="bg-surface rounded-2xl shadow-soft p-4 text-sm text-text">
          Current: course earnings are held <span className="font-semibold">{current.holdDays} days</span>; minimum payout{' '}
          <span className="font-semibold">{formatMoney(current.minimumPayout)}</span>.
          <p className="text-xs text-muted mt-1">Changing the hold period also changes when existing unpaid earnings become available.</p>
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-soft p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <label className="text-xs text-muted">
          Hold days (0–90)
          <input className={`${input} mt-1`} value={holdDays} onChange={(e) => setHoldDays(e.target.value)} placeholder={current ? String(current.holdDays) : '7'} />
        </label>
        <label className="text-xs text-muted">
          Minimum payout (₹)
          <input className={`${input} mt-1`} value={minimum} onChange={(e) => setMinimum(e.target.value)} placeholder={current?.minimumPayout ?? '100.00'} />
        </label>
        <label className="text-xs text-muted sm:col-span-3">
          Note (optional)
          <input className={`${input} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="sm:col-span-3">
          <button disabled={!valid || save.isPending} onClick={() => save.mutate()} className={primaryButton}>
            {save.isPending ? 'Saving...' : 'Save new settings'}
          </button>
          {save.isError && <span className="text-xs text-danger-600 ml-3">{errorMessage(save.error)}</span>}
        </div>
      </div>

      {query.data && (
        <div className="bg-surface rounded-2xl shadow-soft overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-strong/60">
              <tr>
                <th className={th}>Effective from</th>
                <th className={`${th} text-right`}>Hold days</th>
                <th className={`${th} text-right`}>Minimum</th>
                <th className={th}>Changed by</th>
                <th className={th}>Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data.history.map((h) => (
                <tr key={h.id}>
                  <td className={td}>{formatDateTime(h.effectiveFrom)}</td>
                  <td className={`${td} text-right`}>{h.holdDays}</td>
                  <td className={`${td} text-right`}>{formatMoney(h.minimumPayout)}</td>
                  <td className={td}>{h.createdByName ?? 'System'}</td>
                  <td className={`${td} text-xs text-muted`}>{h.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── page ─────────────────────────

const TABS = [
  { key: 'requests', label: 'Payout requests' },
  { key: 'balances', label: 'Teacher balances' },
  { key: 'settings', label: 'Settings' },
] as const;

export default function AdminPayouts() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('requests');
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <DashboardLayout sidebarSections={adminSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Payouts</h1>
      <p className="text-muted mb-6">
        Approve, process and review teacher payouts. Every payout lists the exact ledger lines it settles.
      </p>

      <div className="flex gap-2 mb-6">
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
        {tab === 'requests' && <RequestsTab onOpen={setOpenId} />}
        {tab === 'balances' && <BalancesTab onOpenPayout={setOpenId} />}
        {tab === 'settings' && <SettingsTab />}
      </div>

      {openId && <PayoutDetailModal payoutId={openId} scope="admin" onClose={() => setOpenId(null)} />}
    </DashboardLayout>
  );
}