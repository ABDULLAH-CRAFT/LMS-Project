import { useState } from 'react'; // form state
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; // queries + mutations + cache invalidation
import { api } from '../lib/axios'; // shared axios instance
import { useCurrentUser } from '../hooks/useCurrentUser'; // real logged-in user data
import DashboardLayout from './DashboardLayout'; // sidebar + navbar shell
import type { SidebarSection } from './Sidebar'; // type for the sidebar prop
import type { LearningStats } from '../types/progress'; // shape of GET /progress/me/stats
import { useTeacherOverview } from '../hooks/useTeacherOverview'; // NEW — teaching stats for the teacher variant

interface ProfilePageProps {
  sidebarSections: SidebarSection[]; // passed in by StudentProfile or TeacherProfile
  variant?: 'student' | 'teacher'; // NEW — teachers get teaching stats instead of streak/XP/level. Defaults to 'student', so StudentProfile needs no change
}

// Simple flavor titles by level — purely cosmetic, not derived from any real data.
const LEVEL_TITLES = ['Newcomer', 'Learner', 'Achiever', 'Scholar', 'Expert', 'Master'];

export default function ProfilePage({ sidebarSections, variant = 'student' }: ProfilePageProps) {
  const isTeacher = variant === 'teacher';
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser(); // current name/email/role, used to pre-fill the name field

  const [editingName, setEditingName] = useState(false); // toggled by the hero card's "Edit Profile" button
  const [name, setName] = useState(''); // name form field — synced from `user` once loaded, see below
  const [nameInitialized, setNameInitialized] = useState(false); // tracks whether we've pre-filled the field yet, so we don't overwrite the user's typing on every re-render

  if (user && !nameInitialized) { // runs once, the first time `user` data arrives
    setName(user.name); // pre-fill the input with their current name
    setNameInitialized(true); // mark done so this block doesn't run again
  }

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' }); // change-password form fields
  const [nameMessage, setNameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null); // feedback for the name form
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null); // feedback for the password form

  // Real learning stats — replaces the old MOCK_STATS placeholder now that /progress exists
  const statsQuery = useQuery({
    queryKey: ['learning-stats'],
    queryFn: async () => {
      const response = await api.get<LearningStats>('/progress/me/stats');
      return response.data;
    },
    enabled: !isTeacher, // CHANGED — /progress/me/stats is student-only; teachers used to fire it and get a 403
  });
  const stats = statsQuery.data;
  const teachingQuery = useTeacherOverview(isTeacher); // NEW — only fetched for teachers
  const teaching = teachingQuery.data?.totals;

  const levelTitle = LEVEL_TITLES[Math.min((stats?.level ?? 1) - 1, LEVEL_TITLES.length - 1)];
  const levelPercent = stats ? Math.round((stats.currentLevelXp / stats.nextLevelXp) * 100) : 0;

  const updateNameMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch('/users/me', { name });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] }); // refreshes the navbar/greeting everywhere immediately
      setNameMessage({ type: 'success', text: 'Name updated.' });
    },
    onError: () => {
      setNameMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch('/users/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }); // confirmNewPassword is checked client-side only, never sent to the backend
      return response.data;
    },
    onSuccess: () => {
      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' }); // clear the form after success
    },
    onError: (error: any) => {
      const text = error.response?.data?.message || 'Something went wrong. Please try again.'; // surfaces "Current password is incorrect" directly from the backend
      setPasswordMessage({ type: 'error', text });
    },
  });

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNameMessage(null);
    updateNameMutation.mutate();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) { // client-side check, mirrors the register page's confirm-password pattern
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 6) { // mirrors the backend's MinLength(6) rule, catches it before a wasted API call
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    changePasswordMutation.mutate();
  };

  async function handleShare() {
    const shareData = { title: 'My LMS profile', text: `Check out ${user?.name ?? 'my'} profile on LMS! 🎓` };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user dismissed the share sheet — nothing to do
      }
    } else {
      await navigator.clipboard.writeText(shareData.text);
      setNameMessage(null);
    }
  }

  return (
    <DashboardLayout sidebarSections={sidebarSections}>
      {/* Outer container now spans the available width instead of being capped at max-w-lg everywhere */}
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-1">Profile</h1>
        <p className="text-muted mb-8">Manage your account details and password.</p>

        {/* ===== Top row: hero card + stats/level, side by side on large screens ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
          {/* Hero card */}
          <div className="lg:col-span-1 bg-surface rounded-2xl shadow-soft p-8 flex flex-col items-center text-center">
            <div className="relative w-24 h-24 mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary-200" />
              <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-primary-500 to-secondary-400 flex items-center justify-center text-white text-2xl font-bold shadow-primary-glow">
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-secondary-600 border-2 border-surface flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-text">{user?.name ?? 'Loading...'}</span>
              <span className="bg-primary-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">{isTeacher ? 'INSTRUCTOR' : 'PRO'}</span> {/* CHANGED */}
            </div>
            <p className="text-sm text-muted italic mt-1">{isTeacher ? 'Course Instructor' : 'Lifelong Learner'}</p> {/* CHANGED */}

            <span className="inline-flex items-center gap-1.5 bg-surface-strong rounded-full px-3 py-1.5 text-xs text-muted-dark mt-3 capitalize">
              🎓 {isTeacher ? 'Instructor' : (user?.role ?? 'Student')} • LMS Member
            </span>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setEditingName((v) => !v)}
                className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:scale-[1.02] transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-surface-strong flex items-center justify-center hover:bg-surface-high transition"
                aria-label="Share profile"
              >
                <svg className="w-4 h-4 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342a4 4 0 100-2.684m0 2.684a4 4 0 100 2.684m0-2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a4 4 0 105.94-1.32 4 4 0 00-5.94 1.32zm0 12.632a4 4 0 105.94 1.32 4 4 0 00-5.94-1.32z" />
                </svg>
              </button>
            </div>

            {editingName && (
              <form onSubmit={handleNameSubmit} className="w-full mt-6 text-left">
                <label className="block text-xs font-medium text-muted mb-2">Display name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-strong border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition mb-3"
                />
                {nameMessage && (
                  <p className={`text-xs mb-3 ${nameMessage.type === 'success' ? 'text-secondary-600' : 'text-danger-600'}`}>
                    {nameMessage.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={updateNameMutation.isPending || !name || name === user?.name}
                  className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:scale-[1.01] transition"
                >
                  {updateNameMutation.isPending ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            )}
          </div>

          {/* Right column: streak/XP + level progress, stacked, taking the remaining 2/3 width */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {isTeacher ? (
              /* ===== NEW — teacher variant: teaching stats (real data from /courses/mine/overview) ===== */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { emoji: '📚', tint: 'bg-primary-100', value: teaching?.courses ?? 0, label: 'Courses' },
                  { emoji: '✅', tint: 'bg-secondary-100', value: teaching?.published ?? 0, label: 'Published' },
                  { emoji: '👩‍🎓', tint: 'bg-tertiary-100', value: teaching?.students ?? 0, label: 'Student Enrollments' },
                  { emoji: '🎬', tint: 'bg-surface-strong', value: teaching?.lessons ?? 0, label: 'Lessons Created' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-surface rounded-2xl shadow-soft p-5 flex flex-col items-start gap-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${stat.tint}`}>{stat.emoji}</div>
                    <span className="text-lg font-extrabold text-text">{stat.value.toLocaleString()}</span>
                    <span className="text-xs text-muted-dark">{stat.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
            {/* ===== Stats: streak, XP, lessons completed, courses completed (real data) ===== */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-surface rounded-2xl shadow-soft p-5 flex flex-col items-start gap-2">
                <div className="w-9 h-9 rounded-full bg-tertiary-100 flex items-center justify-center text-lg">🔥</div>
                <span className="text-lg font-extrabold text-text">{stats?.streakDays ?? 0} Days</span>
                <span className="text-xs text-muted-dark">Active Streak</span>
              </div>
              <div className="bg-surface rounded-2xl shadow-soft p-5 flex flex-col items-start gap-2">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-lg">⭐</div>
                <span className="text-lg font-extrabold text-text">{(stats?.xp ?? 0).toLocaleString()}</span>
                <span className="text-xs text-muted-dark">Total XP</span>
              </div>
              <div className="bg-surface rounded-2xl shadow-soft p-5 flex flex-col items-start gap-2">
                <div className="w-9 h-9 rounded-full bg-surface-strong flex items-center justify-center text-lg">📘</div>
                <span className="text-lg font-extrabold text-text">{stats?.lessonsCompleted ?? 0}</span>
                <span className="text-xs text-muted-dark">Lessons Completed</span>
              </div>
              <div className="bg-surface rounded-2xl shadow-soft p-5 flex flex-col items-start gap-2">
                <div className="w-9 h-9 rounded-full bg-secondary-100 flex items-center justify-center text-lg">✅</div>
                <span className="text-lg font-extrabold text-text">{stats?.coursesCompleted ?? 0}</span>
                <span className="text-xs text-muted-dark">Courses Completed</span>
              </div>
            </div>

            {/* ===== Level progress (real data, derived from XP) ===== */}
            <div className="bg-surface rounded-2xl shadow-soft p-5">
              <div className="flex items-center flex-wrap gap-2 mb-3">
                <span className="bg-primary-100 text-primary-700 text-[11px] font-extrabold px-2.5 py-1 rounded-full">
                  LVL {stats?.level ?? 1}
                </span>
                <span className="flex-1 text-sm font-bold text-text">{levelTitle}</span>
                <span className="text-xs text-muted-dark font-semibold">
                  {levelPercent}% to Lvl {(stats?.level ?? 1) + 1}
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-strong overflow-hidden">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary-600 to-secondary-400"
                  style={{ width: `${levelPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-dark mt-2">
                <span>{(stats?.currentLevelXp ?? 0).toLocaleString()} XP</span>
                <span>{(stats?.nextLevelXp ?? 500).toLocaleString()} XP (Target)</span>
              </div>
            </div>
              </>
            )}
          </div>
        </div>

        <h2 className="text-sm font-bold text-text mb-3">Account Settings</h2>

        {/* ===== Bottom row: account info + change password, side by side on large screens ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-start">
          <div className="bg-surface rounded-2xl p-6 shadow-soft">
            <p className="text-xs text-muted uppercase mb-1">Email</p>
            <p className="text-sm text-text mb-4">{user?.email}</p>
            <p className="text-xs text-muted uppercase mb-1">Role</p>
            <p className="text-sm text-text capitalize">{user?.role}</p>
          </div>

          {/* CHANGE PASSWORD FORM */}
          <form onSubmit={handlePasswordSubmit} className="bg-surface rounded-2xl p-6 shadow-soft">
            <h2 className="font-medium text-text mb-4">Change password</h2>

            <input
              type="password"
              placeholder="Current password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full bg-surface-strong border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition mb-3"
            />
            <input
              type="password"
              placeholder="New password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full bg-surface-strong border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition mb-3"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={passwordForm.confirmNewPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
              className="w-full bg-surface-strong border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition mb-1"
            />

            {passwordMessage && (
              <p className={`text-xs mt-2 mb-3 ${passwordMessage.type === 'success' ? 'text-secondary-600' : 'text-danger-600'}`}>
                {passwordMessage.text}
              </p>
            )}

            <button
              type="submit"
              disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
              className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:scale-[1.01] transition mt-2"
            >
              {changePasswordMutation.isPending ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}