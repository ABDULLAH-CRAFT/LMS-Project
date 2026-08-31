import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import DashboardLayout from '../components/DashboardLayout';
import { adminSidebarSections } from '../config/adminSidebar';
import type { CurrentUser } from '../types/user';

interface CreateTeacherForm {
  name: string;
  email: string;
  password: string;
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateTeacherForm>({ name: '', email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState('');

  const teachersQuery = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const response = await api.get<CurrentUser[]>('/admin/teachers');
      return response.data;
    },
  });

  const createTeacherMutation = useMutation({
    mutationFn: async (data: CreateTeacherForm) => {
      const response = await api.post('/admin/create-teacher', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setFormData({ name: '', email: '', password: '' });
      setErrorMessage('');
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to create teacher');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    createTeacherMutation.mutate(formData);
  };

  return (
    <DashboardLayout sidebarSections={adminSidebarSections}>
      <h1 className="text-3xl font-bold text-white mb-1">Manage Teachers</h1> {/* CHANGED — white heading */}
      <p className="text-gray-500 mb-8">Create teacher accounts and see everyone with teaching access.</p>

      <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl mb-8 max-w-lg"> {/* CHANGED — glass form */}
        <h2 className="font-medium text-white mb-4">Add a new teacher</h2> {/* CHANGED — white */}

        <input
          type="text"
          placeholder="Full name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition mb-3" // CHANGED — glass input
        />

        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition mb-3"
        />

        <input
          type="text"
          placeholder="Temporary password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition mb-1"
        />
        <p className="text-xs text-gray-600 mb-3">This will be emailed to the teacher — at least 6 characters.</p> {/* CHANGED — muted hint */}

        {errorMessage && <p className="text-red-400 text-xs mb-3">{errorMessage}</p>} {/* CHANGED — lighter red */}

        <button
          type="submit"
          disabled={createTeacherMutation.isPending}
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-400 text-white rounded-lg py-2 text-sm font-semibold hover:scale-[1.01] transition disabled:opacity-50" // CHANGED — gradient button
        >
          {createTeacherMutation.isPending ? 'Creating...' : 'Create Teacher'}
        </button>
      </form>

      <div className="max-w-lg">
        <h2 className="font-medium text-white mb-3">All Teachers</h2> {/* CHANGED — white */}

        {teachersQuery.isLoading && <p className="text-sm text-gray-500">Loading...</p>}

        {teachersQuery.data?.map((teacher) => (
          <div key={teacher.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 backdrop-blur-xl mb-3 flex items-center justify-between"> {/* CHANGED — glass row */}
            <div>
              <p className="font-medium text-white">{teacher.name}</p> {/* CHANGED — white name */}
              <p className="text-xs text-gray-500">{teacher.email}</p>
            </div>
            <span className="text-xs text-gray-600"> {/* CHANGED — muted date */}
              Joined {new Date(teacher.createdAt).toLocaleDateString()}
            </span>
          </div>
        ))}

        {teachersQuery.data?.length === 0 && (
          <p className="text-sm text-gray-500">No teachers yet — add one above.</p>
        )}
      </div>
    </DashboardLayout>
  );
}