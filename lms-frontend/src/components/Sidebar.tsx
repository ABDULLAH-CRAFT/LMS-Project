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
  collapsed?: boolean; // icon-only rail when true
  onToggle?: () => void; // called when the edge button is clicked
}

export default function Sidebar({ sections, collapsed = false, onToggle }: SidebarProps) {
  const location = useLocation(); // current URL path, used to mark the active link

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-60'} min-h-screen bg-surface border-r border-border text-text flex flex-col fixed left-0 top-0 z-20 shadow-soft transition-[width] duration-200`}
    > {/* soft-UI panel — raised white surface against the canvas bg */}

      {/* COLLAPSE / EXPAND BUTTON — sits half outside the right edge */}
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-7 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-soft hover:text-primary-700 hover:bg-primary-100 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d={collapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
            />
          </svg>
        </button>
      )}

      {/* LOGO — matches Landing.tsx's logo mark */}
      <div className={`py-6 border-b border-border flex items-center gap-3 ${collapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center"> {/* logo container */}
          <div className="absolute h-7 w-7 rotate-45 rounded-lg border border-primary-600/60 bg-primary-100" /> {/* rotated diamond shape */}
          <span className="relative z-10 text-xs font-black text-primary-700">L</span> {/* letter mark on top */}
        </div>
        {!collapsed && <span className="text-lg font-bold">LMS<span className="text-primary-600">.</span></span>} {/* wordmark with indigo dot accent */}
      </div>

      <nav className={`flex-1 py-6 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-3'}`}> {/* scrollable nav area */}
        {sections.map((section, index) => (
          <div key={section.section} className="mb-6"> {/* spacing between groups */}
            {collapsed ? (
              index > 0 && <div className="mx-2 mb-3 border-t border-border" /> // thin divider instead of the section label
            ) : (
              <p className="px-3 text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                {section.section}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined} // native tooltip when only the icon is visible
                  aria-label={item.label}
                  className={`flex items-center rounded-xl text-sm mb-1 transition ${
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 border border-primary-200 font-medium' // active state — soft indigo tint
                      : 'text-muted hover:bg-surface-strong hover:text-text' // subtle hover on the light panel
                  }`}
                >
                  <svg className={collapsed ? 'w-5 h-5 shrink-0' : 'w-4 h-4 shrink-0'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}