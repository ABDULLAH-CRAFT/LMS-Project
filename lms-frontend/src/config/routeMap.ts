// Maps every dashboard path to a human-readable page title, used by Navbar.
export const routeMap: Record<string, string> = {
  '/student': 'All Courses',
  '/student/my-courses': 'My Courses',
  '/student/membership': 'Membership', // R6
  '/student/assignments': 'Assignments',
  '/student/announcements': 'Announcements',
  '/student/profile': 'Profile',
  '/student/messages': 'Messages',
  '/student/settings': 'Settings',
  '/teacher': 'Dashboard',
  '/teacher/drafts': 'Draft Courses',
  '/teacher/published': 'Published Courses',
  '/teacher/announcements': 'Announcements',
  '/teacher/earnings': 'Earnings Overview', // R5
  '/teacher/earnings/courses': 'Course Sales', // R5
  '/teacher/earnings/membership': 'Membership Earnings', // R12
  '/teacher/earnings/statements': 'Statements', // R5
   '/teacher/earnings/payouts': 'Payouts', // R13
  '/teacher/profile': 'Profile',
  '/admin': 'Manage Teachers',
  '/admin/courses': 'All Courses',
  '/admin/revenue': 'Revenue Overview', // R4
  '/admin/course-sales': 'Course Sales', // R4
  '/admin/membership': 'Membership', // placeholder until R6
  '/admin/membership-periods': 'Revenue Periods', // R10
  '/admin/payouts': 'Payouts', // R13
  '/admin/reconciliation': 'Audit & Reconciliation', // R14
  '/admin/engagement': 'Engagement Analytics', // R9
};

export const DEFAULT_PAGE_TITLE = 'Dashboard'; // fallback for routes not in the map, e.g. /courses/:id