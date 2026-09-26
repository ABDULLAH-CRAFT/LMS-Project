// Maps every dashboard path to a human-readable page title, used by Navbar.
export const routeMap: Record<string, string> = {
  '/student': 'All Courses',
  '/student/my-courses': 'My Courses',
  '/student/assignments': 'Assignments',
  '/student/profile': 'Profile',
  '/student/messages': 'Messages',
  '/student/settings': 'Settings',
  '/teacher': 'Overview', // NEW — the teacher's own home page
  '/teacher/drafts': 'Draft Courses',
  '/teacher/published': 'Published Courses',
  '/teacher/profile': 'Profile',
  '/admin': 'Manage Teachers', // CHANGED — was "Admin Dashboard", now reflects what's actually on the page
};

export const DEFAULT_PAGE_TITLE = 'Dashboard'; // unchanged — fallback for routes not in the map, e.g. /courses/:id

// NEW — same lookup as before, plus titles for pages whose URL contains an id (which a plain map can't match)
export function getPageTitle(pathname: string): string {
  if (routeMap[pathname]) return routeMap[pathname];
  if (/^\/teacher\/courses\/[^/]+\/edit$/.test(pathname)) return 'Course Builder';
  if (/^\/courses\/[^/]+$/.test(pathname)) return 'Course Preview';
  return DEFAULT_PAGE_TITLE;
}
