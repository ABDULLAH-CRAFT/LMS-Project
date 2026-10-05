import type { SidebarSection } from '../components/Sidebar'; // shared type from Sidebar.tsx

export const adminSidebarSections: SidebarSection[] = [
  {
    section: 'Management', // group heading
    items: [
      { label: 'Teachers', path: '/admin', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a4 4 0 11-8 0 4 4 0 018 0z' }, // people/group icon
      { label: 'Courses', path: '/admin/courses', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' }, // open book icon
    ],
  },
  {
    section: 'Finance', // NEW (Phase R4)
    items: [
      { label: 'Revenue', path: '/admin/revenue', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }, // bar chart icon
      { label: 'Course Sales', path: '/admin/course-sales', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' }, // shopping bag icon
      { label: 'Membership', path: '/admin/membership', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' }, // sparkles icon (placeholder page until R6)
      { label: 'Revenue Periods', path: '/admin/membership-periods', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }, // calendar icon (R10)
      { label: 'Payouts', path: '/admin/payouts', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' }, // cash icon (placeholder page until R13)
    ],
  },
    {
    section: 'Analytics', // R9
    items: [
      { label: 'Engagement Analytics', path: '/admin/engagement', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' }, // trending-up icon
      { label: 'Membership Analytics', path: '/admin/membership-analytics', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' }, // bar-chart-in-box icon (R11)
    ],
  },
];