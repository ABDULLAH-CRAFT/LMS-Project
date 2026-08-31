import { Link, useLocation } from 'react-router-dom'; // Link navigates, useLocation highlights the active item

export interface SidebarItem { // one clickable link
  label: string;
  path: string;
  icon: string; // SVG path data
}

export interface SidebarSection { // a labeled group of links
  section: string;
  items: SidebarItem[];
}

interface SidebarProps {
  sections: SidebarSection[]; // passed in by whichever dashboard is using this sidebar
}

export default function Sidebar({ sections }: SidebarProps) {
  const location = useLocation(); // current URL path, used to mark the active link

  return (
    <aside className="w-60 min-h-screen bg-[#030308] border-r border-white/5 text-white flex flex-col fixed left-0 top-0 z-20"> {/* CHANGED — dark theme bg, subtle right border instead of navy block */}

      {/* LOGO — matches Landing.tsx's logo mark */}
      <div className="px-6 py-6 border-b border-white/5 flex items-center gap-3"> {/* CHANGED — added the diamond logo mark */}
        <div className="relative flex h-8 w-8 items-center justify-center"> {/* logo container */}
          <div className="absolute h-7 w-7 rotate-45 rounded-lg border border-purple-400/70 bg-purple-500/10" /> {/* rotated diamond shape */}
          <span className="relative z-10 text-xs font-black">L</span> {/* letter mark on top */}
        </div>
        <span className="text-lg font-bold">LMS<span className="text-purple-400">.</span></span> {/* wordmark with purple dot accent */}
      </div>

      <nav className="flex-1 px-3 py-6 overflow-y-auto"> {/* scrollable nav area */}
        {sections.map((section) => (
          <div key={section.section} className="mb-6"> {/* spacing between groups */}
            <p className="px-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-2"> {/* CHANGED — darker muted label for contrast on black bg */}
              {section.section}
            </p>
            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 transition ${
                    isActive
                      ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium' // CHANGED — purple glass active state matches the auth pages
                      : 'text-gray-500 hover:bg-white/5 hover:text-white' // CHANGED — subtle hover on dark bg
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}