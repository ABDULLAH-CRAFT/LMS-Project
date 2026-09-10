import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/axios';
import {
  registerSchema,
  type RegisterFormValues,
} from '../schemas/auth.schema';
import type { AuthResponse } from '../types/auth';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof RegisterFormValues, string>>
  >({});

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      const { confirmPassword, ...payload } = data;

      const response = await api.post('/auth/register', payload);

      return response.data as AuthResponse;
    },

    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      window.dispatchEvent(new Event('auth-changed'));

      navigate('/student');
    },

    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Registration failed';

      setErrors({
        email: message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = registerSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: typeof errors = {};

      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof RegisterFormValues;

        fieldErrors[field] = issue.message;
      });

      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    registerMutation.mutate(result.data);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative flex items-center justify-center px-6 py-10">

      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="fixed inset-0 -z-10 overflow-hidden">

        {/* Purple Glow */}
        <div className="absolute -top-40 -right-40 w-125 h-125 rounded-full bg-purple-600/20 blur-[130px]" />

        {/* Cyan Glow */}
        <div className="absolute -bottom-40 -left-40 w-125 h-125 rounded-full bg-cyan-500/15 blur-[130px]" />

        {/* Pink Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-87.5 h-87.5 rounded-full bg-pink-500/10 blur-[130px]" />

        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:60px_60px]" />

      </div>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-16 items-center">

        {/* ===================================================
            LEFT SIDE
        ==================================================== */}

        <div className="hidden lg:block">

          {/* Logo */}
          <Link
            to="/"
            className="inline-flex items-center gap-3 mb-14 group"
          >
            <div className="w-11 h-11 rounded-xl bg-white text-black flex items-center justify-center font-black text-lg group-hover:rotate-6 transition-transform">
              L
            </div>

            <span className="text-xl font-bold">
              LMS<span className="text-purple-400">.</span>
            </span>
          </Link>

          <div className="max-w-xl">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-gray-400 mb-7">

              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />

              Start your journey

            </div>

            {/* Heading */}
            <h1 className="text-5xl xl:text-6xl font-black leading-[1.05] tracking-tight">

              Create your
              <br />

              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                future today.
              </span>

            </h1>

            {/* Description */}
            <p className="text-lg text-gray-500 leading-relaxed mt-7 max-w-lg">
              Join a modern learning platform designed to help
              you learn new skills, track your progress and build
              the future you want.
            </p>

            {/* Benefits */}
            <div className="mt-10 space-y-4">

              {/* Benefit 1 */}
              <div className="flex items-center gap-4">

                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  ⚡
                </div>

                <div>
                  <p className="font-medium">
                    Learn at your own pace
                  </p>

                  <p className="text-sm text-gray-600">
                    Study whenever and wherever you want.
                  </p>
                </div>

              </div>

              {/* Benefit 2 */}
              <div className="flex items-center gap-4">

                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  🎓
                </div>

                <div>
                  <p className="font-medium">
                    Learn from real teachers
                  </p>

                  <p className="text-sm text-gray-600">
                    Access courses created by approved instructors.
                  </p>
                </div>

              </div>

              {/* Benefit 3 */}
              <div className="flex items-center gap-4">

                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                  🚀
                </div>

                <div>
                  <p className="font-medium">
                    Build real skills
                  </p>

                  <p className="text-sm text-gray-600">
                    Turn what you learn into meaningful progress.
                  </p>
                </div>

              </div>

            </div>
          </div>
        </div>

        {/* ===================================================
            REGISTER CARD
        ==================================================== */}

        <div className="w-full max-w-md mx-auto">

          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">

            <Link
              to="/"
              className="flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-xl bg-white text-black flex items-center justify-center font-black text-lg">
                L
              </div>

              <span className="text-xl font-bold">
                LMS<span className="text-purple-400">.</span>
              </span>
            </Link>

          </div>

          {/* Card */}
          <div className="relative">

            {/* Glow */}
            <div className="absolute inset-0 bg-purple-500/10 blur-[80px] rounded-full" />

            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.045] backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-black/40">

              {/* Header */}
              <div className="mb-8">

                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center text-xl mb-6">
                  ✨
                </div>

                <h2 className="text-3xl font-bold tracking-tight">
                  Create account
                </h2>

                <p className="text-sm text-gray-500 mt-2">
                  Create your account and start learning today.
                </p>

              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* Name */}
                <div>

                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Full name
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
                      👤
                    </span>

                    <input
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          name: e.target.value,
                        });

                        if (errors.name) {
                          setErrors({
                            ...errors,
                            name: undefined,
                          });
                        }
                      }}
                      className={`w-full bg-white/[0.04] border ${
                        errors.name
                          ? 'border-red-500/50'
                          : 'border-white/10'
                      } rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-gray-700 outline-none transition focus:border-purple-500/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-purple-500/10`}
                    />

                  </div>

                  {errors.name && (
                    <p className="text-red-400 text-xs mt-2 px-1">
                      {errors.name}
                    </p>
                  )}

                </div>

                {/* Email */}
                <div>

                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Email address
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
                      @
                    </span>

                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          email: e.target.value,
                        });

                        if (errors.email) {
                          setErrors({
                            ...errors,
                            email: undefined,
                          });
                        }
                      }}
                      className={`w-full bg-white/[0.04] border ${
                        errors.email
                          ? 'border-red-500/50'
                          : 'border-white/10'
                      } rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-gray-700 outline-none transition focus:border-purple-500/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-purple-500/10`}
                    />

                  </div>

                  {errors.email && (
                    <p className="text-red-400 text-xs mt-2 px-1">
                      {errors.email}
                    </p>
                  )}

                </div>

                {/* Password */}
                <div>

                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Password
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
                      •
                    </span>

                    <input
                      type="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          password: e.target.value,
                        });

                        if (errors.password) {
                          setErrors({
                            ...errors,
                            password: undefined,
                          });
                        }
                      }}
                      className={`w-full bg-white/[0.04] border ${
                        errors.password
                          ? 'border-red-500/50'
                          : 'border-white/10'
                      } rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-gray-700 outline-none transition focus:border-purple-500/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-purple-500/10`}
                    />

                  </div>

                  {errors.password && (
                    <p className="text-red-400 text-xs mt-2 px-1">
                      {errors.password}
                    </p>
                  )}

                </div>

                {/* Confirm Password */}
                <div>

                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Confirm password
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
                      ✓
                    </span>

                    <input
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        });

                        if (errors.confirmPassword) {
                          setErrors({
                            ...errors,
                            confirmPassword: undefined,
                          });
                        }
                      }}
                      className={`w-full bg-white/[0.04] border ${
                        errors.confirmPassword
                          ? 'border-red-500/50'
                          : 'border-white/10'
                      } rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-gray-700 outline-none transition focus:border-purple-500/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-purple-500/10`}
                    />

                  </div>

                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-2 px-1">
                      {errors.confirmPassword}
                    </p>
                  )}

                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="group relative w-full overflow-hidden rounded-xl bg-white text-black py-3.5 text-sm font-semibold transition hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 mt-2"
                >

                  <span className="relative z-10 flex items-center justify-center gap-2">

                    {registerMutation.isPending
                      ? 'Creating account...'
                      : 'Create account'}

                    {!registerMutation.isPending && (
                      <span className="group-hover:translate-x-1 transition">
                        →
                      </span>
                    )}

                  </span>

                  <div className="absolute inset-0 bg-gradient-to-r from-purple-300 to-cyan-300 opacity-0 group-hover:opacity-100 transition" />

                </button>

              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-7">

                <div className="h-px bg-white/10 flex-1" />

                <span className="text-[10px] uppercase tracking-widest text-gray-700">
                  Already a member?
                </span>

                <div className="h-px bg-white/10 flex-1" />

              </div>

              {/* Login */}
              <Link
                to="/login"
                className="flex items-center justify-center w-full rounded-xl border border-white/10 bg-white/[0.02] py-3.5 text-sm font-medium text-gray-300 hover:bg-white/[0.06] hover:text-white transition"
              >
                Sign in to your account
              </Link>

            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-700 mt-6">
            By creating an account, you agree to our terms and privacy policy.
          </p>

        </div>
      </div>
    </div>
  );
}

