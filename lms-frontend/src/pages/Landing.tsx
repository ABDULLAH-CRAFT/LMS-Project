
import { Link } from 'react-router-dom';

function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
      <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M7 16l4-5 3 3 6-8" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030308] text-white">

      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0">

        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-purple-700/20 blur-[140px]" />

        <div className="absolute -right-40 top-[25%] h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[140px]" />

        <div className="absolute -bottom-40 left-[20%] h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[140px]" />

        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="relative z-50 border-b border-white/5 bg-[#030308]/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">

            <div className="relative flex h-10 w-10 items-center justify-center">

              <div className="absolute h-8 w-8 rotate-45 rounded-lg border border-purple-400/70 bg-purple-500/10 shadow-[0_0_25px_rgba(139,92,246,0.25)]" />

              <span className="relative z-10 text-sm font-black">
                L
              </span>

            </div>

            <span className="text-xl font-bold tracking-tight">
              LMS
              <span className="text-purple-400">.</span>
            </span>

          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 text-sm text-gray-400 md:flex">

            <a
              href="#features"
              className="transition-colors hover:text-white"
            >
              Features
            </a>

            <a
              href="#courses"
              className="transition-colors hover:text-white"
            >
              Courses
            </a>

            {/* <a
              href="#teachers"
              className="transition-colors hover:text-white"
            >
              For Teachers
            </a> */}

            <a
              href="#about"
              className="transition-colors hover:text-white"
            >
              About
            </a>

          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">

            <Link
              to="/login"
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-white sm:px-5"
            >
              Sign In
            </Link>

            <Link
              to="/register"
              className="rounded-xl bg-gradient-to-r from-purple-600 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-700/20 transition hover:scale-[1.02] sm:px-5"
            >
              Sign Up
            </Link>

          </div>

        </nav>
      </header>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="relative z-10">

        {/* ===================================================
            HERO
        ==================================================== */}

        <section className="mx-auto max-w-7xl px-5 pb-20 pt-20 sm:px-6 lg:px-8 lg:pb-28 lg:pt-28">

          <div className="grid items-center gap-16 lg:grid-cols-2">

            {/* LEFT SIDE */}
            <div>

              {/* Badge */}
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-purple-300">

                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />

                Learn
                <span className="text-gray-600">•</span>
                Grow
                <span className="text-gray-600">•</span>
                Achieve

              </div>

              {/* Heading */}
              <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">

                Learn without

                <span className="mt-2 block bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  limits.
                </span>

              </h1>

              {/* Description */}
              <p className="mt-7 max-w-xl text-base leading-7 text-gray-400 sm:text-lg">
                Courses taught by real teachers, built for students
                who want to move at their own pace.
              </p>

              {/* Buttons */}
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">

                <Link
                  to="/register"
                  className="group flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-400 px-6 py-3.5 text-sm font-semibold shadow-xl shadow-purple-700/20 transition hover:scale-[1.02]"
                >
                  Get started — it's free

                  <span className="transition-transform group-hover:translate-x-1">
                    <ArrowIcon />
                  </span>
                </Link>

                <Link
                  to="/login"
                  className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-gray-300 transition hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-white"
                >
                  I already have an account
                </Link>

              </div>

              {/* Mini Features */}
              <div className="mt-12 grid gap-6 sm:grid-cols-3">

                <div className="group">

                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400 transition group-hover:scale-105">
                    <SparkIcon />
                  </div>

                  <h3 className="text-sm font-semibold">
                    Learn at your pace
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Study whenever you want.
                  </p>

                </div>

                <div className="group">

                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 transition group-hover:scale-105">
                    <UsersIcon />
                  </div>

                  <h3 className="text-sm font-semibold">
                    Real teachers
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Learn from instructors.
                  </p>

                </div>

                <div className="group">

                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 transition group-hover:scale-105">
                    <ChartIcon />
                  </div>

                  <h3 className="text-sm font-semibold">
                    Track progress
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Monitor your growth.
                  </p>

                </div>

              </div>

            </div>

            {/* =================================================
                DASHBOARD PREVIEW
            ================================================== */}

            <div className="relative mx-auto w-full max-w-[620px]">

              {/* Glow */}
              <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-[100px] sm:h-[450px] sm:w-[450px]" />

              {/* Floating elements */}
              <div className="absolute -left-2 top-16 z-20 h-7 w-7 rotate-45 rounded-md border border-purple-400/60 bg-purple-500/20 shadow-lg shadow-purple-500/30 sm:left-0" />

              <div className="absolute right-2 top-2 z-20 h-14 w-14 rounded-full bg-gradient-to-br from-purple-500/50 to-blue-600/10 shadow-[0_0_50px_rgba(139,92,246,0.4)] sm:h-20 sm:w-20" />

              <div className="absolute bottom-16 right-4 z-20 h-5 w-5 rotate-45 rounded-md border border-cyan-400/50 bg-cyan-400/10" />

              {/* Dashboard */}
              <div className="relative transition duration-700 hover:rotate-0 lg:rotate-[2deg]">

                <div className="absolute -inset-4 rounded-[35px] bg-gradient-to-r from-purple-600/20 via-blue-500/10 to-cyan-400/20 blur-2xl" />

                <div className="relative rounded-[25px] border border-purple-400/30 bg-[#090914]/95 p-2 shadow-2xl shadow-purple-900/40 backdrop-blur-2xl sm:p-3">

                  {/* Browser Header */}
                  <div className="flex items-center justify-between rounded-t-[18px] border-b border-white/5 bg-white/[0.025] px-3 py-3 sm:px-5">

                    <div className="flex items-center gap-1.5">

                      <span className="h-2 w-2 rounded-full bg-red-400/70" />
                      <span className="h-2 w-2 rounded-full bg-yellow-400/70" />
                      <span className="h-2 w-2 rounded-full bg-green-400/70" />

                    </div>

                    <div className="hidden rounded-lg border border-white/5 bg-black/30 px-8 py-1.5 text-[8px] text-gray-600 sm:block">
                      app.lms.com/dashboard
                    </div>

                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400" />

                  </div>

                  {/* Dashboard */}
                  <div className="p-3 sm:p-5">

                    {/* Welcome */}
                    <div className="mb-5 flex items-center justify-between">

                      <div>

                        <p className="text-[8px] uppercase tracking-widest text-gray-600 sm:text-[9px]">
                          Student dashboard
                        </p>

                        <h2 className="mt-1 text-sm font-bold sm:text-lg">
                          Welcome back, Alex
                        </h2>

                      </div>

                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 text-xs font-bold">
                        A
                      </div>

                    </div>

                    {/* Stats */}
                    <div className="grid gap-3 sm:grid-cols-[1.5fr_0.7fr]">

                      {/* Continue Learning */}
                      <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-3 sm:p-4">

                        <div className="mb-4 flex items-center justify-between">

                          <div>
                            <p className="text-[8px] text-gray-600 sm:text-[9px]">
                              Continue learning
                            </p>

                            <p className="mt-1 text-xs font-semibold sm:text-sm">
                              UI/UX Design
                            </p>
                          </div>

                          <span className="rounded-full bg-purple-500/10 px-2 py-1 text-[8px] text-purple-300">
                            75%
                          </span>

                        </div>

                        <div className="flex gap-3">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-sm font-bold sm:h-12 sm:w-12">
                            UI
                          </div>

                          <div className="flex flex-1 flex-col justify-center">

                            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/5">

                              <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400" />

                            </div>

                            <p className="text-[7px] text-gray-600 sm:text-[8px]">
                              18 of 24 lessons completed
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* Progress */}
                      <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-3 sm:p-4">

                        <p className="text-[8px] text-gray-600 sm:text-[9px]">
                          Your progress
                        </p>

                        <div className="mt-3 flex justify-center">

                          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-cyan-400/20 sm:h-20 sm:w-20">

                            <div className="absolute inset-[-6px] rounded-full border-[6px] border-transparent border-r-cyan-400 border-t-blue-500 rotate-[35deg]" />

                            <div className="text-center">

                              <p className="text-sm font-bold sm:text-lg">
                                68%
                              </p>

                              <p className="text-[6px] text-gray-600 sm:text-[7px]">
                                COMPLETE
                              </p>

                            </div>

                          </div>

                        </div>

                      </div>

                    </div>

                    {/* Recent Courses */}
                    <div className="mt-4">

                      <div className="mb-3 flex items-center justify-between">

                        <p className="text-[10px] font-semibold">
                          Recent courses
                        </p>

                        <span className="text-[8px] text-purple-400">
                          View all
                        </span>

                      </div>

                      <div className="grid grid-cols-3 gap-2">

                        {/* Course 1 */}
                        <div className="rounded-xl border border-white/5 bg-white/[0.025] p-2">

                          <div className="flex h-14 items-center justify-center rounded-lg bg-gradient-to-br from-purple-700/60 to-blue-800/40 sm:h-16">
                            <span className="text-sm font-black sm:text-xl">
                              JS
                            </span>
                          </div>

                          <p className="mt-2 truncate text-[8px] font-semibold sm:text-[9px]">
                            JavaScript Basics
                          </p>

                          <p className="mt-1 text-[7px] text-gray-600">
                            18 lessons
                          </p>

                        </div>

                        {/* Course 2 */}
                        <div className="rounded-xl border border-white/5 bg-white/[0.025] p-2">

                          <div className="flex h-14 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700/60 to-cyan-800/30 sm:h-16">
                            <span className="text-xs font-black sm:text-xl">
                              WEB
                            </span>
                          </div>

                          <p className="mt-2 truncate text-[8px] font-semibold sm:text-[9px]">
                            Web Development
                          </p>

                          <p className="mt-1 text-[7px] text-gray-600">
                            24 lessons
                          </p>

                        </div>

                        {/* Course 3 */}
                        <div className="rounded-xl border border-white/5 bg-white/[0.025] p-2">

                          <div className="flex h-14 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-700/60 to-purple-800/40 sm:h-16">
                            <span className="text-sm font-black sm:text-xl">
                              DS
                            </span>
                          </div>

                          <p className="mt-2 truncate text-[8px] font-semibold sm:text-[9px]">
                            Data Structures
                          </p>

                          <p className="mt-1 text-[7px] text-gray-600">
                            16 lessons
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

                {/* Laptop Base */}
                <div className="relative mx-auto h-4 w-[82%] rounded-b-[40%] border-x border-b border-purple-400/30 bg-gradient-to-b from-purple-900/70 to-[#07070e] shadow-2xl shadow-purple-900/40">

                  <div className="mx-auto mt-1 h-1 w-20 rounded-full bg-purple-400/30" />

                </div>

                <div className="mx-auto h-2 w-[70%] rounded-full bg-gradient-to-r from-purple-700/20 via-cyan-400/40 to-purple-700/20" />

              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            TRUST BAR
        ==================================================== */}

        <section className="border-y border-white/5 bg-white/[0.015]">

          <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-7 sm:px-6 md:flex-row md:justify-center">

            <span className="text-center text-[9px] font-medium uppercase tracking-[0.2em] text-gray-600">
              Built for modern learners
            </span>

            <div className="hidden h-4 w-px bg-white/10 md:block" />

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-gray-600 sm:gap-x-10">

              <span>Students</span>
              <span>Teachers</span>
              <span>Institutions</span>
              <span>Creators</span>

            </div>

          </div>

        </section>

        {/* ===================================================
            FEATURES
        ==================================================== */}

        <section
          id="features"
          className="mx-auto max-w-7xl px-5 py-24 sm:px-6 lg:px-8"
        >

          <div className="mx-auto max-w-2xl text-center">

            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-400">
              Everything you need
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              A better way to learn.
            </h2>

            <p className="mt-5 text-gray-500">
              Everything is designed around helping you learn,
              practice and make measurable progress.
            </p>

          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">

            {/* Feature 1 */}
            <div className="group rounded-3xl border border-white/10 bg-white/[0.025] p-7 transition duration-300 hover:-translate-y-1 hover:border-purple-500/40 hover:bg-purple-500/[0.04]">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-400">
                <SparkIcon />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                Learn at your pace
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                No fixed schedules. Start a lesson when you want
                and continue exactly where you stopped.
              </p>

            </div>

            {/* Feature 2 */}
            <div className="group rounded-3xl border border-white/10 bg-white/[0.025] p-7 transition duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-cyan-500/[0.04]">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
                <UsersIcon />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                Real teachers
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Learn from instructors who create practical,
                structured and engaging courses.
              </p>

            </div>

            {/* Feature 3 */}
            <div className="group rounded-3xl border border-white/10 bg-white/[0.025] p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:bg-blue-500/[0.04]">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                <ChartIcon />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                Track your progress
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                See lessons completed, courses in progress and
                how far you've come.
              </p>

            </div>

          </div>

        </section>

        {/* ===================================================
            COURSES
        ==================================================== */}

        <section
          id="courses"
          className="mx-auto max-w-7xl px-5 pb-24 sm:px-6 lg:px-8"
        >

          <div className="overflow-hidden rounded-[32px] border border-purple-500/20 bg-gradient-to-br from-purple-900/20 via-[#090912] to-cyan-900/10 p-7 sm:p-10 lg:p-12">

            <div className="grid items-center gap-12 lg:grid-cols-2">

              {/* Text */}
              <div>

                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
                  Explore your potential
                </p>

                <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">

                  Courses that turn

                  <span className="block bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-transparent">
                    knowledge into skills.
                  </span>

                </h2>

                <p className="mt-5 max-w-lg leading-7 text-gray-500">
                  From programming and design to business and
                  personal development, discover courses designed
                  to help you actually build something.
                </p>

                <Link
                  to="/register"
                  className="mt-8 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-gray-200"
                >
                  Start learning
                  <ArrowIcon />
                </Link>

              </div>

              {/* Course Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">

                  <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/50 to-blue-700/30 text-2xl font-black sm:h-28">
                    JS
                  </div>

                  <p className="mt-3 text-sm font-semibold">
                    JavaScript
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    24 lessons
                  </p>

                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">

                  <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600/40 to-blue-700/30 text-xl font-black sm:h-28">
                    WEB
                  </div>

                  <p className="mt-3 text-sm font-semibold">
                    Web Development
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    32 lessons
                  </p>

                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">

                  <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-pink-600/40 to-purple-700/30 text-2xl font-black sm:h-28">
                    UI
                  </div>

                  <p className="mt-3 text-sm font-semibold">
                    UI/UX Design
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    18 lessons
                  </p>

                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">

                  <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/40 to-indigo-700/30 text-2xl font-black sm:h-28">
                    DS
                  </div>

                  <p className="mt-3 text-sm font-semibold">
                    Data Structures
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    21 lessons
                  </p>

                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">

                  <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/40 to-red-700/30 text-2xl font-black sm:h-28">
                    PY
                  </div>

                  <p className="mt-3 text-sm font-semibold">
                    Python
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    27 lessons
                  </p>

                </div>

                <div className="flex min-h-[155px] items-center justify-center rounded-2xl border border-dashed border-purple-500/30 bg-purple-500/[0.03]">

                  <div className="text-center">

                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
                      <PlayIcon />
                    </div>

                    <p className="mt-3 text-xs text-gray-500">
                      And many more
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            TEACHERS
        ==================================================== */}

        <section
          id="teachers"
          className="mx-auto max-w-7xl px-5 pb-24 sm:px-6 lg:px-8"
        >

          <div className="grid items-center gap-10 rounded-[32px] border border-white/10 bg-white/[0.02] p-8 sm:p-10 lg:grid-cols-2 lg:p-12">

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-400">
                Built for teachers
              </p>

              <h2 className="mt-4 text-4xl font-bold">
                Teach what you know.
              </h2>

              <p className="mt-5 max-w-lg leading-7 text-gray-500">
                Create structured courses, manage your lessons
                and help students learn through a powerful
                teaching experience.
              </p>

              <Link
                to="/login"
                className="mt-7 inline-flex items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/10 px-6 py-3.5 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/20"
              >
                Teacher login
                <ArrowIcon />
              </Link>

            </div>

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                <p className="text-3xl font-bold">
                  01
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Create courses
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                <p className="text-3xl font-bold">
                  02
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Add lessons
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                <p className="text-3xl font-bold">
                  03
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Teach students
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                <p className="text-3xl font-bold">
                  04
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Track results
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            FINAL CTA
        ==================================================== */}

        <section
          id="about"
          className="mx-auto max-w-5xl px-5 pb-24 text-center sm:px-6 lg:px-8"
        >

          <div className="relative overflow-hidden rounded-[32px] border border-purple-500/20 bg-white/[0.025] px-6 py-16 sm:px-10">

            {/* Glow */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-purple-600/20 blur-[100px]" />

            <div className="relative">

              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-400">
                Your journey starts here
              </p>

              <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
                Ready to learn something new?
              </h2>

              <p className="mx-auto mt-5 max-w-xl leading-7 text-gray-500">
                Create your free account and start building the
                skills that will take you where you want to go.
              </p>

              <Link
                to="/register"
                className="mt-8 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-400 px-7 py-3.5 text-sm font-semibold shadow-xl shadow-purple-700/20 transition hover:scale-[1.03]"
              >
                Get started for free
                <ArrowIcon />
              </Link>

            </div>

          </div>

        </section>

      </main>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="border-t border-white/5">

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-8 sm:px-6 md:flex-row lg:px-8">

          <Link
            to="/"
            className="flex items-center gap-3"
          >

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-cyan-400 text-xs font-black text-white">
              L
            </div>

            <span className="font-semibold">
              LMS
            </span>

          </Link>

          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} LMS. All rights reserved.
          </p>

          <p className="text-xs text-gray-600">
            Built by{' '}
            <span className="text-gray-300">
              Abdullah
            </span>
          </p>

        </div>

      </footer>

    </div>
  );
}

