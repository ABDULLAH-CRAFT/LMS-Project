import type { SidebarSection } from '../components/Sidebar'; // shared type from Sidebar.tsx

export const adminSidebarSections: SidebarSection[] = [
  {
    section: 'Management', // group heading
    items: [
      { label: 'Teachers', path: '/admin', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a4 4 0 11-8 0 4 4 0 018 0z' }, // people/group icon
    ],
  },
];