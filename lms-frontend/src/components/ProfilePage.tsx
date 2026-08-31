import { useState } from 'react'; // form state
import { useMutation, useQueryClient } from '@tanstack/react-query'; // update mutations + cache invalidation
import { api } from '../lib/axios'; // shared axios instance
import { useCurrentUser } from '../hooks/useCurrentUser'; // real logged-in user data
import DashboardLayout from './DashboardLayout'; // sidebar + navbar shell
import type { SidebarSection } from './Sidebar'; // type for the sidebar prop

interface ProfilePageProps {
  sidebarSections: SidebarSection[]; // passed in by StudentProfile or TeacherProfile — the ONLY thing that differs between them
}

export default function ProfilePage({ sidebarSections }: ProfilePageProps) {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser(); // current name/email/role, used to pre-fill the name field

  const [name, setName] = useState(''); // name form field — synced from `user` once loaded, see below
  const [nameInitialized, setNameInitialized] = useState(false); // tracks whether we've pre-filled the field yet, so we don't overwrite the user's typing on every re-render

  if (user && !nameInitialized) { // runs once, the first time `user` data arrives
    setName(user.name); // pre-fill the input with their current name
    setNameInitialized(true); // mark done so this block doesn't run again
  }

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' }); // change-password form fields
  const [nameMessage, setNameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null); // feedback for the name form
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null); // feedback for the password form

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

  return (
    <DashboardLayout sidebarSections={sidebarSections}>
      <h1 className="text-3xl font-bold text-white mb-1">Profile</h1> {/* page heading */}
      <p className="text-gray-500 mb-8">Manage your account details and password.</p>

      {/* ACCOUNT INFO — read-only summary */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl mb-6 max-w-lg"> {/* glass card, matches the rest of the theme */}
        <div className="flex items-center gap-4"> {/* avatar + basic info row */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white text-xl font-semibold"> {/* larger version of the navbar avatar */}
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-white font-medium">{user?.name ?? 'Loading...'}</p> {/* current name */}
            <p className="text-sm text-gray-500">{user?.email}</p> {/* email, not editable here */}
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 capitalize"> {/* role badge */}
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* EDIT NAME FORM */}
      <form onSubmit={handleNameSubmit} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl mb-6 max-w-lg"> {/* glass form card */}
        <h2 className="font-medium text-white mb-4">Display name</h2>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)} // updates the local name field only
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition mb-3"
        />

        {nameMessage && ( // shows success or error feedback after submit
          <p className={`text-xs mb-3 ${nameMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {nameMessage.text}
          </p>
        )}

        <button
          type="submit"
          disabled={updateNameMutation.isPending || !name || name === user?.name} // disabled if empty, unchanged, or already submitting
          className="bg-gradient-to-r from-purple-600 to-cyan-400 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:scale-[1.01] transition"
        >
          {updateNameMutation.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </form>

      {/* CHANGE PASSWORD FORM */}
      <form onSubmit={handlePasswordSubmit} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl max-w-lg"> {/* glass form card */}
        <h2 className="font-medium text-white mb-4">Change password</h2>

        <input
          type="password"
          placeholder="Current password"
          value={passwordForm.currentPassword}
          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition mb-3"
        />
        <input
          type="password"
          placeholder="New password"
          value={passwordForm.newPassword}
          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition mb-3"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={passwordForm.confirmNewPassword}
          onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition mb-1"
        />

        {passwordMessage && (
          <p className={`text-xs mt-2 mb-3 ${passwordMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {passwordMessage.text}
          </p>
        )}

        <button
          type="submit"
          disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword} // disabled while empty or submitting
          className="bg-gradient-to-r from-purple-600 to-cyan-400 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:scale-[1.01] transition mt-2"
        >
          {changePasswordMutation.isPending ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </DashboardLayout>
  );
}