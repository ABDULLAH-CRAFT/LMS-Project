import { Link, useLocation } from 'react-router-dom'; // Link navigates, useLocation highlights the active item
import { getRole } from '../lib/auth'; // NEW — used for the role label under the logo

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
  const role = getRole();
  const roleLabel = role === 'teacher' ? 'Instructor Studio' : role === 'admin' ? 'Admin Console' : null; // NEW — gives the teacher/admin portals their own identity; students keep the plain logo

  return (
    <aside className="w-60 min-h-screen bg-surface border-r border-border text-text flex flex-col fixed left-0 top-0 z-20 shadow-soft"> {/* soft-UI panel — raised white surface against the canvas bg */}

      {/* LOGO — matches Landing.tsx's logo mark */}
      <div className="px-6 py-6 border-b border-border flex items-center gap-3">
        <div className="relative flex h-8 w-8 items-center justify-center"> {/* logo container */}
          <div className="absolute h-7 w-7 rotate-45 rounded-lg border border-primary-600/60 bg-primary-100" /> {/* rotated diamond shape */}
          <span className="relative z-10 text-xs font-black text-primary-700">L</span> {/* letter mark on top */}
        </div>
        <div className="leading-tight"> {/* CHANGED — wordmark + optional role label stacked */}
          <span className="text-lg font-bold">LMS<span className="text-primary-600">.</span></span> {/* wordmark with indigo dot accent */}
          {roleLabel && <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-600">{roleLabel}</p>}
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 overflow-y-auto"> {/* scrollable nav area */}
        {sections.map((section) => (
          <div key={section.section} className="mb-6"> {/* spacing between groups */}
            <p className="px-3 text-[11px] font-semibold text-muted uppercase tracking-wider mb-2"> {/* CHANGED — darker muted label for contrast on black bg */}
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
                      ? 'bg-primary-100 text-primary-700 border border-primary-200 font-medium' // active state — soft indigo tint
                      : 'text-muted hover:bg-surface-strong hover:text-text' // subtle hover on the light panel
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