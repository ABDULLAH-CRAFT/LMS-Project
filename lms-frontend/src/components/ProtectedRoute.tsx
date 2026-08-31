import { Navigate } from 'react-router-dom'; // component that redirects instead of rendering children
import type { ReactNode } from 'react'; // type for "anything React can render" — used to accept the protected page as a child

interface ProtectedRouteProps { // defines what props this component accepts
  children: ReactNode; // the actual dashboard page we're protecting (e.g. <StudentDashboard />)
  allowedRoles: string[]; // which roles are allowed to see this page, e.g. ['student']
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('accessToken'); // check if a token exists at all

  if (!token) { // no token means the user was never logged in, or it expired and got cleared
    return <Navigate to="/login" replace />; // send them to login — `replace` means this doesn't add an extra "back" step in browser history
  }

  let role: string; // will hold the role we decode from the token
  try {
    const payload = JSON.parse(atob(token.split('.')[1])); // decode the JWT's payload section (same trick used in Login.tsx)
    role = payload.role; // pull out the role field we put in the token on the backend
  } catch {
    return <Navigate to="/login" replace />; // if the token is malformed/corrupted, treat it as not logged in
  }

  if (!allowedRoles.includes(role)) { // token is valid, but this role isn't allowed on THIS specific route
    return <Navigate to="/login" replace />; // for now, bounce to login — later you could send them to their OWN dashboard instead
  }

  return <>{children}</>; // all checks passed — render the actual protected page
}