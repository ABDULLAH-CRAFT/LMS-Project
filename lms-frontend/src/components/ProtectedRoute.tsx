import { Navigate } from 'react-router-dom'; // component that redirects instead of rendering children
import type { ReactNode } from 'react'; // type for "anything React can render" — used to accept the protected page as a child
import { getRole, homePathForRole } from '../lib/auth'; // NEW

interface ProtectedRouteProps { // defines what props this component accepts
  children: ReactNode; // the actual dashboard page we're protecting (e.g. <StudentDashboard />)
  allowedRoles: string[]; // which roles are allowed to see this page, e.g. ['student']
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('accessToken'); // check if a token exists at all

  if (!token) { // no token means the user was never logged in, or it expired and got cleared
    return <Navigate to="/login" replace />; // send them to login — `replace` means this doesn't add an extra "back" step in browser history
  }

  const role = getRole(); // decodes the JWT's payload (null if the token is malformed/corrupted)
  if (!role) {
    return <Navigate to="/login" replace />; // treat a broken token as not logged in
  }

  if (!allowedRoles.includes(role)) { // logged in, but this role isn't allowed on THIS route
    return <Navigate to={homePathForRole(role)} replace />; // CHANGED — send them to THEIR OWN dashboard (e.g. a teacher who opens /student lands on /teacher) instead of bouncing to login
  }

  return <>{children}</>; // all checks passed — render the actual protected page
}
