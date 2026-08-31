// Maps every dashboard path to a human-readable page title, used by Navbar.
export const routeMap: Record<string, string> = {
  '/student': 'All Courses',
  '/student/my-courses': 'My Courses',
  '/student/assignments': 'Assignments',
  '/student/profile': 'Profile',
  '/student/messages': 'Messages',
  '/student/settings': 'Settings',
  '/teacher/drafts': 'Draft Courses',
  '/teacher/published': 'Published Courses',
  '/teacher/profile': 'Profile',
  '/admin': 'Manage Teachers', // CHANGED — was "Admin Dashboard", now reflects what's actually on the page
};

export const DEFAULT_PAGE_TITLE = 'Dashboard'; // unchanged — fallback for routes not in the map, e.g. /courses/:id