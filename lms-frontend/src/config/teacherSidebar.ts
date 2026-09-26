import type { SidebarSection } from '../components/Sidebar';

export const teacherSidebarSections: SidebarSection[] = [
  {
    section: 'Teaching',
    items: [
      { label: 'Overview', path: '/teacher', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z' }, // NEW — the teacher's own home page (dashboard grid icon)
      { label: 'Draft Courses', path: '/teacher/drafts', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' }, // pencil/edit icon — fits "in progress" work
      { label: 'Published Courses', path: '/teacher/published', icon: 'M5 13l4 4L19 7' }, // checkmark icon — fits "done/live"
    ],
  },
  {
    section: 'Account',
    items: [
      { label: 'Profile', path: '/teacher/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    ],
  },
];
