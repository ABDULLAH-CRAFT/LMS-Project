import { useNavigate, useLocation } from 'react-router-dom';
import { routeMap, DEFAULT_PAGE_TITLE } from '../config/routeMap';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useCart } from '../context/CartComtext';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const { items } = useCart();

  const pageTitle = routeMap[location.pathname] ?? DEFAULT_PAGE_TITLE;

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  return (
    <header className="h-16 bg-[#030308]/70 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-10">
      <span className="text-sm font-semibold text-gray-300">{pageTitle}</span>

      <div className="flex items-center gap-5">
        <button onClick={() => navigate('/cart')} className="relative text-gray-500 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {items.length}
            </span>
          )}
        </button>

        <button className="relative text-gray-500 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white text-xs font-semibold">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <span className="text-sm font-medium text-gray-300">{user?.name ?? 'Loading...'}</span>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs font-medium text-gray-500 hover:text-white transition border-l border-white/10 pl-5"
        >
          Log out
        </button>
      </div>
    </header>
  );
}