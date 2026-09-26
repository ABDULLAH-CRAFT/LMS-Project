// Small helpers for "who is logged in?" that work synchronously, straight from the JWT in localStorage.
// (The rest of the app already decodes the token this way in login.tsx / ProtectedRoute.tsx.)

export type Role = 'admin' | 'teacher' | 'student';

// Reads the role out of the access token. Returns null if nobody is logged in or the token is malformed.
export function getRole(): Role | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  try {
    // JWTs are base64URL encoded ("-" and "_"), but atob() only understands plain base64 — convert first
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

// Each role's "home" page. Used to send people to THEIR dashboard instead of bouncing them to /login.
export function homePathForRole(role: Role | null): string {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  if (role === 'student') return '/student';
  return '/login';
}
