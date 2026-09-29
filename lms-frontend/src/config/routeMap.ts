// Maps every dashboard path to a human-readable page title, used by Navbar.
export const routeMap: Record<string, string> = {
  '/student': 'All Courses',
  '/student/my-courses': 'My Courses',
  '/student/assignments': 'Assignments',
  '/student/announcements': 'Announcements',
  '/student/profile': 'Profile',
  '/student/messages': 'Messages',
  '/student/settings': 'Settings',
  '/teacher': 'Dashboard',
  '/teacher/drafts': 'Draft Courses',
  '/teacher/published': 'Published Courses',
  '/teacher/announcements': 'Announcements',
  '/teacher/earnings': 'Earnings',
  '/teacher/profile': 'Profile',
  '/admin': 'Manage Teachers',
  '/admin/courses': 'All Courses',
};

export const DEFAULT_PAGE_TITLE = 'Dashboard'; // fallback for routes not in the map, e.g. /courses/:id