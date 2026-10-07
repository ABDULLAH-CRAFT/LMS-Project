import { useEffect, useState, type ReactNode } from 'react';
import Sidebar, { type SidebarSection } from './Sidebar';
import Navbar from './Navbar';

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarSections: SidebarSection[];
}

const STORAGE_KEY = 'sidebarCollapsed';

// Remembered choice wins; with no saved choice, small screens start collapsed.
function readInitialCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === 'true';
  } catch {
    // storage can be unavailable (private mode); fall through to the default
  }
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

export default function DashboardLayout({ children, sidebarSections }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState<boolean>(readInitialCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore: the sidebar still works, it just will not be remembered
    }
  }, [collapsed]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden"> {/* dark base + overflow-hidden to contain the glow blobs below */}

      {/* Ambient background glow — same device as Landing.tsx, kept subtle since dashboards need to stay readable */}
      <div className="pointer-events-none fixed inset-0 z-0"> {/* decorative glow layer, doesn't intercept clicks */}
        <div className="absolute -left-40 -top-40 h-125 w-125 rounded-full bg-primary-700/10 blur-[140px]" /> {/* softer opacity than landing page — this is a work surface, not a hero */}
        <div className="absolute -right-40 top-1/3 h-125 w-125 rounded-full bg-secondary-600/10 blur-[140px]" />
      </div>

      <Sidebar sections={sidebarSections} collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} /> {/* fixed left column */}

      <div className={`${collapsed ? 'ml-16' : 'ml-60'} relative z-10 transition-[margin] duration-200`}> {/* z-10 keeps content above the glow layer; margin follows the sidebar width */}
        <Navbar />
        <main className="px-8 py-10">{children}</main>
      </div>
    </div>
  );
}