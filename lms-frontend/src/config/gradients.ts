// Shared gradient palette used for course card banners (no thumbnail system yet).
// Single source of truth — was duplicated in StudentDashboard.tsx and StudentMyCourses.tsx.
// Ported 1:1 from lms-mobile/constants/theme.ts GRADIENTS so web course cards use
// the exact same indigo / teal / amber stops as the mobile app.
export const GRADIENTS = [
  'from-[#4437e6] to-[#3020bf]', // primary hero gradient
  'from-[#4f46e5] to-[#3525cd]',
  'from-[#00916a] to-[#006c4a]', // secondary / teal
  'from-[#ff8a3d] to-[#934e00]', // tertiary / amber
  'from-[#6366f1] to-[#4438ca]',
  'from-[#00b884] to-[#00714e]',
];
