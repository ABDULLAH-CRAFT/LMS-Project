import { useNavigate, useLocation } from 'react-router-dom'; // navigation + current path
import { routeMap, DEFAULT_PAGE_TITLE } from '../config/routeMap'; // path-to-title lookup
import { useCurrentUser } from '../hooks/useCurrentUser'; // real logged-in user data

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useCurrentUser();

  const pageTitle = routeMap[location.pathname] ?? DEFAULT_PAGE_TITLE;

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  return (
    <header className="h-16 bg-[#030308]/70 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-10"> {/* CHANGED — dark glass bar matching Landing's nav */}

      <span className="text-sm font-semibold text-gray-300">{pageTitle}</span> {/* CHANGED — lighter text for dark bg */}

      <div className="flex items-center gap-5">
        <button className="relative text-gray-500 hover:text-white transition"> {/* CHANGED — muted-on-dark colors */}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white text-xs font-semibold"> {/* CHANGED — gradient avatar matches theme */}
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <span className="text-sm font-medium text-gray-300">{user?.name ?? 'Loading...'}</span> {/* CHANGED — light text on dark bg */}
        </div>

        <button
          onClick={handleLogout}
          className="text-xs font-medium text-gray-500 hover:text-white transition border-l border-white/10 pl-5" // CHANGED — dark-theme divider + hover
        >
          Log out
        </button>
      </div>
    </header>
  );
}