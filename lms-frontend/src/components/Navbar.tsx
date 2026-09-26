import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getPageTitle } from '../config/routeMap';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useCart } from '../context/CartComtext';
import { disconnectPaymentSocket } from '../lib/socket';
import { getRole } from '../lib/auth';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { items } = useCart();

  const role = getRole(); // CHANGED — read straight from the token, so the navbar is right instantly and can't show a previous user's role
  const isStudent = role === 'student';

  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    disconnectPaymentSocket();
    queryClient.clear(); // NEW — wipe cached data (current user, courses...) so the next person to log in on this tab never sees the previous user's data
    window.dispatchEvent(new Event('auth-changed')); // NEW — tells the cart / socket hooks the session ended
    navigate('/login');
  };

  return (
    <header className="h-16 bg-background/70 backdrop-blur-xl border-b border-border flex items-center justify-between px-8 sticky top-0 z-10">
      <span className="text-sm font-semibold text-muted-dark">{pageTitle}</span>

      <div className="flex items-center gap-5">
        {/* Cart is a student-only feature — teachers and admins don't buy courses, so they never see it */}
        {isStudent && (
          <button onClick={() => navigate('/cart')} className="relative text-muted hover:text-text transition" aria-label="Cart">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {items.length}
              </span>
            )}
          </button>
        )}

        <button className="relative text-muted hover:text-text transition" aria-label="Notifications">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-danger-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-400 flex items-center justify-center text-white text-xs font-semibold">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <span className="text-sm font-medium text-muted-dark">{user?.name ?? 'Loading...'}</span>
          {/* NEW — role badge so a teacher/admin can tell at a glance which portal they're in */}
          {role && role !== 'student' && (
            <span className="text-[10px] font-bold uppercase tracking-wide bg-primary-100 text-primary-700 rounded-full px-2 py-0.5">
              {role === 'teacher' ? 'Instructor' : 'Admin'}
            </span>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="text-xs font-medium text-muted hover:text-text transition border-l border-border pl-5"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
