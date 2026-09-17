
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
    <div className="min-h-screen overflow-x-hidden bg-background text-text">

      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0">

        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary-700/20 blur-[140px]" />

        <div className="absolute -right-40 top-[25%] h-[500px] w-[500px] rounded-full bg-primary-600/15 blur-[140px]" />

        <div className="absolute -bottom-40 left-[20%] h-[500px] w-[500px] rounded-full bg-secondary-500/10 blur-[140px]" />

        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(30,41,59,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(30,41,59,0.035) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="relative z-50 border-b border-border bg-background/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">

            <div className="relative flex h-10 w-10 items-center justify-center">

              <div className="absolute h-8 w-8 rotate-45 rounded-lg border border-primary-600/70 bg-primary-100 shadow-[0_0_25px_rgba(53,37,205,0.2)]" />

              <span className="relative z-10 text-sm font-black">
                L
              </span>

            </div>

            <span className="text-xl font-bold tracking-tight">
              LMS
              <span className="text-primary-600">.</span>
            </span>

          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 text-sm text-muted md:flex">

            <a
              href="#features"
              className="transition-colors hover:text-text"
            >
              Features
            </a>

            <a
              href="#courses"
              className="transition-colors hover:text-text"
            >
              Courses
            </a>

            {/* <a
              href="#teachers"
              className="transition-colors hover:text-text"
            >
              For Teachers
            </a> */}

            <a
              href="#about"
              className="transition-colors hover:text-text"
            >
              About
            </a>

          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">

            <Link
              to="/login"
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-dark transition hover:border-primary-500/40 hover:bg-primary-500/10 hover:text-primary-700 sm:px-5"
            >
              Sign In
            </Link>

            <Link
              to="/register"
              className="rounded-xl bg-gradient-to-r from-primary-600 to-secondary-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-700/20 transition hover:scale-[1.02] sm:px-5"
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
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-primary-700">

                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-400" />

                Learn
                <span className="text-muted">•</span>
                Grow
                <span className="text-muted">•</span>
                Achieve

              </div>

              {/* Heading */}
              <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">

                Learn without

                <span className="mt-2 block bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent">
                  limits.
                </span>

              </h1>

              {/* Description */}
              <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg">
                Courses taught by real teachers, built for students
                who want to move at their own pace.
              </p>

              {/* Buttons */}
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">

                <Link
                  to="/register"
                  className="group flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-primary-600 to-secondary-400 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-primary-700/20 transition hover:scale-[1.02]"
                >
                  Get started — it's free

                  <span className="transition-transform group-hover:translate-x-1">
                    <ArrowIcon />
                  </span>
                </Link>

                <Link
                  to="/login"
                  className="flex items-center justify-center rounded-xl border border-border bg-surface-strong px-6 py-3.5 text-sm font-medium text-muted-dark transition hover:border-primary-500/40 hover:bg-primary-500/10 hover:text-white"
                >
                  I already have an account
                </Link>

              </div>

              {/* Mini Features */}
              <div className="mt-12 grid gap-6 sm:grid-cols-3">

                <div className="group">

                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/10 text-primary-600 transition group-hover:scale-105">
                    <SparkIcon />
                  </div>

                  <h3 className="text-sm font-semibold">
                    Learn at your pace
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-muted">
                    Study whenever you want.
                  </p>

                </div>

                <div className="group">

                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-secondary-500/30 bg-secondary-500/10 text-secondary-600 transition group-hover:scale-105">
                    <UsersIcon />
                  </div>

                  <h3 className="text-sm font-semibold">
                    Real teachers
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-muted">
                    Learn from instructors.
                  </p>

                </div>

                <div className="group">

                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/10 text-primary-600 transition group-hover:scale-105">
                    <ChartIcon />
                  </div>

                  <h3 className="text-sm font-semibold">
                    Track progress
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-muted">
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
              <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-600/20 blur-[100px] sm:h-[450px] sm:w-[450px]" />

              {/* Floating elements */}
              <div className="absolute -left-2 top-16 z-20 h-7 w-7 rotate-45 rounded-md border border-primary-400/60 bg-primary-500/20 shadow-lg shadow-primary-500/30 sm:left-0" />

              <div className="absolute right-2 top-2 z-20 h-14 w-14 rounded-full bg-gradient-to-br from-primary-500/50 to-primary-600/10 shadow-[0_0_50px_rgba(53,37,205,0.35)] sm:h-20 sm:w-20" />

              <div className="absolute bottom-16 right-4 z-20 h-5 w-5 rotate-45 rounded-md border border-secondary-400/50 bg-secondary-400/10" />

              {/* Dashboard */}
              <div className="relative transition duration-700 hover:rotate-0 lg:rotate-[2deg]">

                <div className="absolute -inset-4 rounded-[35px] bg-gradient-to-r from-primary-600/20 via-primary-500/10 to-secondary-400/20 blur-2xl" />

                <div className="relative rounded-[25px] border border-primary-400/30 bg-[#090914]/95 p-2 shadow-2xl shadow-primary-900/40 backdrop-blur-2xl sm:p-3">

                  {/* Browser Header */}
                  <div className="flex items-center justify-between rounded-t-[18px] border-b border-border bg-surface px-3 py-3 sm:px-5">

                    <div className="flex items-center gap-1.5">

                      <span className="h-2 w-2 rounded-full bg-danger-400/70" />
                      <span className="h-2 w-2 rounded-full bg-tertiary-400/70" />
                      <span className="h-2 w-2 rounded-full bg-secondary-400/70" />

                    </div>

                    <div className="hidden rounded-lg border border-border bg-text/30 px-8 py-1.5 text-[8px] text-muted sm:block">
                      app.lms.com/dashboard
                    </div>

                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500" />

                  </div>

                  {/* Dashboard */}
                  <div className="p-3 sm:p-5">

                    {/* Welcome */}
                    <div className="mb-5 flex items-center justify-between">

                      <div>

                        <p className="text-[8px] uppercase tracking-widest text-muted sm:text-[9px]">
                          Student dashboard
                        </p>

                        <h2 className="mt-1 text-sm font-bold sm:text-lg">
                          Welcome back, Alex
                        </h2>

                      </div>

                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-xs font-bold text-white">
                        A
                      </div>

                    </div>

                    {/* Stats */}
                    <div className="grid gap-3 sm:grid-cols-[1.5fr_0.7fr]">

                      {/* Continue Learning */}
                      <div className="rounded-2xl border border-border bg-surface shadow-soft p-3 sm:p-4">

                        <div className="mb-4 flex items-center justify-between">

                          <div>
                            <p className="text-[8px] text-muted sm:text-[9px]">
                              Continue learning
                            </p>

                            <p className="mt-1 text-xs font-semibold sm:text-sm">
                              UI/UX Design
                            </p>
                          </div>

                          <span className="rounded-full bg-primary-500/10 px-2 py-1 text-[8px] text-primary-700">
                            75%
                          </span>

                        </div>

                        <div className="flex gap-3">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 text-sm font-bold text-white sm:h-12 sm:w-12">
                            UI
                          </div>

                          <div className="flex flex-1 flex-col justify-center">

                            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface">

                              <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary-500 to-secondary-400" />

                            </div>

                            <p className="text-[7px] text-muted sm:text-[8px]">
                              18 of 24 lessons completed
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* Progress */}
                      <div className="rounded-2xl border border-border bg-surface shadow-soft p-3 sm:p-4">

                        <p className="text-[8px] text-muted sm:text-[9px]">
                          Your progress
                        </p>

                        <div className="mt-3 flex justify-center">

                          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-secondary-400/20 sm:h-20 sm:w-20">

                            <div className="absolute inset-[-6px] rounded-full border-[6px] border-transparent border-r-secondary-400 border-t-primary-500 rotate-[35deg]" />

                            <div className="text-center">

                              <p className="text-sm font-bold sm:text-lg">
                                68%
                              </p>

                              <p className="text-[6px] text-muted sm:text-[7px]">
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

                        <span className="text-[8px] text-primary-600">
                          View all
                        </span>

                      </div>

                      <div className="grid grid-cols-3 gap-2">

                        {/* Course 1 */}
                        <div className="rounded-xl border border-border bg-surface p-2">

                          <div className="flex h-14 items-center justify-center rounded-lg bg-gradient-to-br from-primary-700/60 to-primary-800/40 text-white sm:h-16">
                            <span className="text-sm font-black sm:text-xl">
                              JS
                            </span>
                          </div>

                          <p className="mt-2 truncate text-[8px] font-semibold sm:text-[9px]">
                            JavaScript Basics
                          </p>

                          <p className="mt-1 text-[7px] text-muted">
                            18 lessons
                          </p>

                        </div>

                        {/* Course 2 */}
                        <div className="rounded-xl border border-border bg-surface p-2">

                          <div className="flex h-14 items-center justify-center rounded-lg bg-gradient-to-br from-primary-700/60 to-secondary-800/30 text-white sm:h-16">
                            <span className="text-xs font-black sm:text-xl">
                              WEB
                            </span>
                          </div>

                          <p className="mt-2 truncate text-[8px] font-semibold sm:text-[9px]">
                            Web Development
                          </p>

                          <p className="mt-1 text-[7px] text-muted">
                            24 lessons
                          </p>

                        </div>

                        {/* Course 3 */}
                        <div className="rounded-xl border border-border bg-surface p-2">

                          <div className="flex h-14 items-center justify-center rounded-lg bg-gradient-to-br from-primary-700/60 to-primary-800/40 text-white sm:h-16">
                            <span className="text-sm font-black sm:text-xl">
                              DS
                            </span>
                          </div>

                          <p className="mt-2 truncate text-[8px] font-semibold sm:text-[9px]">
                            Data Structures
                          </p>

                          <p className="mt-1 text-[7px] text-muted">
                            16 lessons
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

                {/* Laptop Base */}
                <div className="relative mx-auto h-4 w-[82%] rounded-b-[40%] border-x border-b border-primary-400/30 bg-gradient-to-b from-primary-900/70 to-[#07070e] shadow-2xl shadow-primary-900/40">

                  <div className="mx-auto mt-1 h-1 w-20 rounded-full bg-primary-400/30" />

                </div>

                <div className="mx-auto h-2 w-[70%] rounded-full bg-gradient-to-r from-primary-700/20 via-secondary-400/40 to-primary-700/20" />

              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            TRUST BAR
        ==================================================== */}

        <section className="border-y border-border bg-surface-strong">

          <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-7 sm:px-6 md:flex-row md:justify-center">

            <span className="text-center text-[9px] font-medium uppercase tracking-[0.2em] text-muted">
              Built for modern learners
            </span>

            <div className="hidden h-4 w-px bg-surface-strong md:block" />

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-muted sm:gap-x-10">

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

            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-600">
              Everything you need
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              A better way to learn.
            </h2>

            <p className="mt-5 text-muted">
              Everything is designed around helping you learn,
              practice and make measurable progress.
            </p>

          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">

            {/* Feature 1 */}
            <div className="group rounded-3xl border border-border bg-surface p-7 transition duration-300 hover:-translate-y-1 hover:border-primary-500/40 hover:bg-primary-500/[0.04]">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-500/20 bg-primary-500/10 text-primary-600">
                <SparkIcon />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                Learn at your pace
              </h3>

              <p className="mt-3 text-sm leading-6 text-muted">
                No fixed schedules. Start a lesson when you want
                and continue exactly where you stopped.
              </p>

            </div>

            {/* Feature 2 */}
            <div className="group rounded-3xl border border-border bg-surface p-7 transition duration-300 hover:-translate-y-1 hover:border-secondary-500/40 hover:bg-secondary-500/[0.04]">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-secondary-500/20 bg-secondary-500/10 text-secondary-600">
                <UsersIcon />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                Real teachers
              </h3>

              <p className="mt-3 text-sm leading-6 text-muted">
                Learn from instructors who create practical,
                structured and engaging courses.
              </p>

            </div>

            {/* Feature 3 */}
            <div className="group rounded-3xl border border-border bg-surface p-7 transition duration-300 hover:-translate-y-1 hover:border-primary-500/40 hover:bg-primary-500/[0.04]">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-500/20 bg-primary-500/10 text-primary-600">
                <ChartIcon />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                Track your progress
              </h3>

              <p className="mt-3 text-sm leading-6 text-muted">
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

          <div className="overflow-hidden rounded-[32px] border border-primary-500/20 bg-gradient-to-br from-primary-900/20 via-[#090912] to-secondary-900/10 p-7 sm:p-10 lg:p-12">

            <div className="grid items-center gap-12 lg:grid-cols-2">

              {/* Text */}
              <div>

                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary-600">
                  Explore your potential
                </p>

                <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">

                  Courses that turn

                  <span className="block bg-gradient-to-r from-primary-400 to-secondary-300 bg-clip-text text-transparent">
                    knowledge into skills.
                  </span>

                </h2>

                <p className="mt-5 max-w-lg leading-7 text-muted">
                  From programming and design to business and
                  personal development, discover courses designed
                  to help you actually build something.
                </p>

                <Link
                  to="/register"
                  className="mt-8 inline-flex items-center gap-3 rounded-xl bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                >
                  Start learning
                  <ArrowIcon />
                </Link>

              </div>

              {/* Course Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

                <div className="rounded-2xl border border-border bg-surface-strong p-3">

                  <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600/50 to-primary-700/30 text-2xl font-black text-white sm:h-28">
                    JS
                  </div>

                  <p className="mt-3 text-sm font-semibold">
                    JavaScript
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    24 lessons
                  </p>

                </div>

                <div className="rounded-2xl border border-border bg-surface-strong p-3">

                  <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-secondary-600/40 to-primary-700/30 text-xl font-black text-white sm:h-28">
                    WEB
                  </div>

                  <p className="mt-3 text-sm font-semibold">
                    Web Development
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    32 lessons
                  </p>

                </div>

                <div className="rounded-2xl border border-border bg-surface-strong p-3">

                  <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-tertiary-600/40 to-primary-700/30 text-2xl font-black text-white sm:h-28">
                    UI
                  </div>

                  <p className="mt-3 text-sm font-semibold">
                    UI/UX Design
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    18 lessons
                  </p>

                </div>

                <div className="rounded-2xl border border-border bg-surface-strong p-3">

                  <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600/40 to-primary-700/30 text-2xl font-black text-white sm:h-28">
                    DS
                  </div>

                  <p className="mt-3 text-sm font-semibold">
                    Data Structures
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    21 lessons
                  </p>

                </div>

                <div className="rounded-2xl border border-border bg-surface-strong p-3">

                  <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-tertiary-500/40 to-danger-700/30 text-2xl font-black text-white sm:h-28">
                    PY
                  </div>

                  <p className="mt-3 text-sm font-semibold">
                    Python
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    27 lessons
                  </p>

                </div>

                <div className="flex min-h-[155px] items-center justify-center rounded-2xl border border-dashed border-primary-500/30 bg-primary-500/[0.03]">

                  <div className="text-center">

                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/10 text-primary-600">
                      <PlayIcon />
                    </div>

                    <p className="mt-3 text-xs text-muted">
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

          <div className="grid items-center gap-10 rounded-[32px] border border-border bg-surface p-8 sm:p-10 lg:grid-cols-2 lg:p-12">

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-600">
                Built for teachers
              </p>

              <h2 className="mt-4 text-4xl font-bold">
                Teach what you know.
              </h2>

              <p className="mt-5 max-w-lg leading-7 text-muted">
                Create structured courses, manage your lessons
                and help students learn through a powerful
                teaching experience.
              </p>

              <Link
                to="/login"
                className="mt-7 inline-flex items-center gap-3 rounded-xl border border-primary-500/30 bg-primary-500/10 px-6 py-3.5 text-sm font-semibold text-primary-200 transition hover:bg-primary-500/20"
              >
                Teacher login
                <ArrowIcon />
              </Link>

            </div>

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-2xl border border-border bg-surface-strong p-5">

                <p className="text-3xl font-bold">
                  01
                </p>

                <p className="mt-2 text-sm text-muted">
                  Create courses
                </p>

              </div>

              <div className="rounded-2xl border border-border bg-surface-strong p-5">

                <p className="text-3xl font-bold">
                  02
                </p>

                <p className="mt-2 text-sm text-muted">
                  Add lessons
                </p>

              </div>

              <div className="rounded-2xl border border-border bg-surface-strong p-5">

                <p className="text-3xl font-bold">
                  03
                </p>

                <p className="mt-2 text-sm text-muted">
                  Teach students
                </p>

              </div>

              <div className="rounded-2xl border border-border bg-surface-strong p-5">

                <p className="text-3xl font-bold">
                  04
                </p>

                <p className="mt-2 text-sm text-muted">
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

          <div className="relative overflow-hidden rounded-[32px] border border-primary-500/20 bg-surface px-6 py-16 sm:px-10">

            {/* Glow */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-primary-600/20 blur-[100px]" />

            <div className="relative">

              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-600">
                Your journey starts here
              </p>

              <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
                Ready to learn something new?
              </h2>

              <p className="mx-auto mt-5 max-w-xl leading-7 text-muted">
                Create your free account and start building the
                skills that will take you where you want to go.
              </p>

              <Link
                to="/register"
                className="mt-8 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-primary-600 to-secondary-400 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-primary-700/20 transition hover:scale-[1.03]"
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

      <footer className="border-t border-border">

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-8 sm:px-6 md:flex-row lg:px-8">

          <Link
            to="/"
            className="flex items-center gap-3"
          >

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-secondary-400 text-xs font-black text-white">
              L
            </div>

            <span className="font-semibold">
              LMS
            </span>

          </Link>

          <p className="text-xs text-muted">
            © {new Date().getFullYear()} LMS. All rights reserved.
          </p>

          <p className="text-xs text-muted">
            Built by{' '}
            <span className="text-muted-dark">
              Abdullah
            </span>
          </p>

        </div>

      </footer>

    </div>
  );
}

