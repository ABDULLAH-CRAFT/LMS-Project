import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { adminSidebarSections } from '../config/adminSidebar';
import { formatDateTime } from '../lib/financeFormat';
import {
  calculateEngagementPeriod,
  createEngagementWeights,
  getEngagementPeriods,
  getEngagementWeights,
  getLatestEngagementRun,
} from '../lib/api/engagementScores';
import type { EngagementRun } from '../types/engagementScores';

const th = 'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap text-left';
const td = 'px-4 py-3 text-sm text-text whitespace-nowrap';
const input = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text';

// Display only: the backend stores exact integers (score x 10,000 and share x 1,000,000).
const score = (scaled: string, scale: number) => (Number(scaled) / scale).toFixed(2);
const share = (ppm: number, scale: number) => ((ppm / scale) * 100).toFixed(2) + '%';
const pct = (bps: number) => (bps / 100).toFixed(2) + '%';

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? error.message;
  }
  return 'Something went wrong';
}

function RunTable({ run }: { run: EngagementRun }) {
  return (
    <div className="bg-surface rounded-2xl shadow-soft mt-4">
      <div className="px-4 py-3 border-b border-border text-xs text-muted">
        <strong className="text-text">
          {run.periodStart} → {run.periodEnd}
        </strong>{' '}
        · run #{run.runNumber} · calculated {formatDateTime(run.calculatedAt)}
        {run.calculatedByName ? ` by ${run.calculatedByName}` : ''} · weights: lessons {pct(run.weights.lessonCompletionBps)}, courses{' '}
        {pct(run.weights.courseCompletionBps)}, assessments {pct(run.weights.assessmentBps)}, returning {pct(run.weights.returningLearnerBps)}, ratings{' '}
        {pct(run.weights.ratingBps)}
        {run.isPartialPeriod && <span className="ml-2 rounded-full bg-primary-100 text-primary-700 px-2 py-0.5">partial month - period not over yet</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className={th}>Teacher</th>
              <th className={th}>Active learners</th>
              <th className={th}>Lessons</th>
              <th className={th}>Courses done</th>
              <th className={th}>Assessments</th>
              <th className={th}>Returning</th>
              <th className={th}>Ratings</th>
              <th className={th}>Lesson score</th>
              <th className={th}>Course score</th>
              <th className={th}>Assess. score</th>
              <th className={th}>Return score</th>
              <th className={th}>Rating score</th>
              <th className={th}>Final score</th>
              <th className={th}>Pool share</th>
            </tr>
          </thead>
          <tbody>
            {run.teachers.length === 0 && (
              <tr>
                <td className={td} colSpan={14}>
                  No membership learning activity was recorded in this period.
                </td>
              </tr>
            )}
            {run.teachers.map((t) => (
              <tr key={t.teacherId} className="border-b border-border last:border-0">
                <td className={td}>{t.teacherName}</td>
                <td className={td}>{t.activeLearners}</td>
                <td className={td}>{t.lessonCompletions}</td>
                <td className={td}>{t.courseCompletions}</td>
                <td className={td}>{t.assessmentEvents}</td>
                <td className={td}>{t.returningLearners}</td>
                <td className={td}>{t.ratingSum}</td>
                <td className={td}>{score(t.lessonScore, run.scoreScale)}</td>
                <td className={td}>{score(t.courseCompletionScore, run.scoreScale)}</td>
                <td className={td}>{score(t.assessmentScore, run.scoreScale)}</td>
                <td className={td}>{score(t.returningLearnerScore, run.scoreScale)}</td>
                <td className={td}>{score(t.ratingScore, run.scoreScale)}</td>
                <td className={`${td} font-semibold`}>{score(t.finalScore, run.scoreScale)}</td>
                <td className={`${td} font-semibold`}>{share(t.poolSharePpm, run.shareScale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoresTab() {
  const queryClient = useQueryClient();
  const [openPeriodId, setOpenPeriodId] = useState<string | null>(null);

  const periodsQuery = useQuery({ queryKey: ['admin-engagement-periods'], queryFn: getEngagementPeriods });
  const runQuery = useQuery({
    queryKey: ['admin-engagement-run', openPeriodId],
    queryFn: () => getLatestEngagementRun(openPeriodId as string),
    enabled: !!openPeriodId,
    retry: false,
  });

  const calculate = useMutation({
    mutationFn: (periodId: string) => calculateEngagementPeriod(periodId),
    onSuccess: (_run, periodId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-engagement-periods'] });
      queryClient.invalidateQueries({ queryKey: ['admin-engagement-run', periodId] });
      setOpenPeriodId(periodId);
    },
  });

  return (
    <>
      <div className="bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3 text-xs text-primary-800 mb-4">
        Scores use only trusted, point-earning activity from students learning through a <strong>membership</strong>. Each calculation is saved as a
        frozen run - recalculating creates a new run and never edits an old one. Calculation is blocked once a period is finalized.
      </div>

      {calculate.isError && <p className="text-sm text-red-600 mb-3">{errorMessage(calculate.error)}</p>}

      <div className="bg-surface rounded-2xl shadow-soft overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className={th}>Period</th>
              <th className={th}>Status</th>
              <th className={th}>Latest run</th>
              <th className={th}>Teachers scored</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {periodsQuery.isLoading && (
              <tr>
                <td className={td} colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {periodsQuery.data?.length === 0 && (
              <tr>
                <td className={td} colSpan={5}>
                  No revenue periods yet. A period appears after the first membership payment of a month.
                </td>
              </tr>
            )}
            {periodsQuery.data?.map((p) => {
              const locked = ['FINALIZED', 'PAYOUT_PROCESSING', 'PAID'].includes(p.status);
              return (
                <tr key={p.periodId} className="border-b border-border last:border-0">
                  <td className={td}>
                    {p.periodStart} → {p.periodEnd}
                  </td>
                  <td className={td}>{p.status}</td>
                  <td className={td}>
                    {p.latestRunNumber ? `#${p.latestRunNumber} · ${formatDateTime(p.latestCalculatedAt as string)}` : 'Not calculated'}
                  </td>
                  <td className={td}>{p.teacherCount ?? '-'}</td>
                  <td className={`${td} space-x-3`}>
                    {p.latestRunId && (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary-600 hover:underline"
                        onClick={() => setOpenPeriodId(openPeriodId === p.periodId ? null : p.periodId)}
                      >
                        {openPeriodId === p.periodId ? 'Hide scores' : 'View scores'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={locked || calculate.isPending}
                      className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-40 disabled:no-underline"
                      onClick={() => calculate.mutate(p.periodId)}
                    >
                      {calculate.isPending && calculate.variables === p.periodId ? 'Calculating…' : p.latestRunId ? 'Recalculate' : 'Calculate'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openPeriodId && runQuery.isLoading && <p className="text-sm text-muted mt-4">Loading scores…</p>}
      {openPeriodId && runQuery.data && <RunTable run={runQuery.data} />}
    </>
  );
}

function WeightsTab() {
  const queryClient = useQueryClient();
  const weightsQuery = useQuery({ queryKey: ['admin-engagement-weights'], queryFn: getEngagementWeights });

  const [month, setMonth] = useState('');
  const [lesson, setLesson] = useState('40');
  const [course, setCourse] = useState('30');
  const [assessment, setAssessment] = useState('15');
  const [returning, setReturning] = useState('10');
  const [rating, setRating] = useState('5');
  const [note, setNote] = useState('');

  const total = [lesson, course, assessment, returning, rating].reduce((acc, v) => acc + (Number(v) || 0), 0);
  const totalOk = Math.abs(total - 100) < 0.0001;

  const create = useMutation({
    mutationFn: () =>
      createEngagementWeights({
        effectiveMonth: month,
        lessonCompletion: lesson,
        courseCompletion: course,
        assessment,
        returningLearner: returning,
        rating,
        note: note || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-engagement-weights'] });
      setNote('');
    },
  });

  const field = (label: string, value: string, set: (v: string) => void) => (
    <label className="block">
      <span className="text-xs font-semibold text-muted">{label} (%)</span>
      <input className={input} type="number" min={0} max={100} step="0.01" value={value} onChange={(e) => set(e.target.value)} />
    </label>
  );

  return (
    <>
      <div className="bg-surface rounded-2xl shadow-soft overflow-x-auto mb-6">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className={th}>Effective from</th>
              <th className={th}>Lessons</th>
              <th className={th}>Courses</th>
              <th className={th}>Assessments</th>
              <th className={th}>Returning</th>
              <th className={th}>Ratings</th>
              <th className={th}>Set by</th>
              <th className={th}>Note</th>
            </tr>
          </thead>
          <tbody>
            {weightsQuery.data?.map((w) => (
              <tr key={w.id} className="border-b border-border last:border-0">
                <td className={td}>{formatDateTime(w.effectiveFrom)}</td>
                <td className={td}>{pct(w.lessonCompletionBps)}</td>
                <td className={td}>{pct(w.courseCompletionBps)}</td>
                <td className={td}>{pct(w.assessmentBps)}</td>
                <td className={td}>{pct(w.returningLearnerBps)}</td>
                <td className={td}>{pct(w.ratingBps)}</td>
                <td className={td}>{w.createdByName ?? 'System'}</td>
                <td className={td}>{w.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-surface rounded-2xl shadow-soft p-5 max-w-3xl">
        <h2 className="text-lg font-bold text-text mb-1">Schedule new weights</h2>
        <p className="text-xs text-muted mb-4">
          New weights apply to a whole month, starting on its 1st. Only future months can be scheduled, so earlier calculations never change.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-muted">Effective month</span>
            <input className={input} type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
          {field('Lesson completion', lesson, setLesson)}
          {field('Course completion', course, setCourse)}
          {field('Assessment', assessment, setAssessment)}
          {field('Returning learners', returning, setReturning)}
          {field('Ratings', rating, setRating)}
        </div>
        <label className="block mt-4">
          <span className="text-xs font-semibold text-muted">Note (optional)</span>
          <input className={input} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="flex items-center gap-4 mt-4">
          <button
            type="button"
            disabled={!month || !totalOk || create.isPending}
            onClick={() => create.mutate()}
            className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-40"
          >
            {create.isPending ? 'Saving…' : 'Schedule weights'}
          </button>
          <span className={`text-xs ${totalOk ? 'text-muted' : 'text-red-600'}`}>Total: {total.toFixed(2)}% (must be 100%)</span>
        </div>
        {create.isError && <p className="text-sm text-red-600 mt-3">{errorMessage(create.error)}</p>}
        {create.isSuccess && <p className="text-sm text-secondary-600 mt-3">Weights scheduled.</p>}
      </div>
    </>
  );
}

export default function AdminEngagementScores() {
  const [tab, setTab] = useState<'scores' | 'weights'>('scores');
  const tabs = [
    { id: 'scores' as const, label: 'Teacher scores' },
    { id: 'weights' as const, label: 'Weights' },
  ];

  return (
    <DashboardLayout sidebarSections={adminSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Engagement Analytics</h1>
      <p className="text-muted mb-6">How learning activity becomes each teacher&apos;s share of the membership pool.</p>

      <div className="flex gap-2 mb-6">
        {tabs.map((item) => (
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

      {tab === 'scores' && <ScoresTab />}
      {tab === 'weights' && <WeightsTab />}
    </DashboardLayout>
  );
}