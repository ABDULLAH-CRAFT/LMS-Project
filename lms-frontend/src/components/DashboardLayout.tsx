import type { ReactNode } from 'react';
import Sidebar, { type SidebarSection } from './Sidebar';
import Navbar from './Navbar';

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarSections: SidebarSection[];
}

export default function DashboardLayout({ children, sidebarSections }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#030308] relative overflow-hidden"> {/* CHANGED — dark base + overflow-hidden to contain the glow blobs below */}

      {/* Ambient background glow — same device as Landing.tsx, kept subtle since dashboards need to stay readable */}
      <div className="pointer-events-none fixed inset-0 z-0"> {/* NEW — decorative glow layer, doesn't intercept clicks */}
        <div className="absolute -left-40 -top-40 h-125 w-125 rounded-full bg-purple-700/10 blur-[140px]" /> {/* softer opacity than landing page — this is a work surface, not a hero */}
        <div className="absolute -right-40 top-1/3 h-125 w-125 rounded-full bg-cyan-600/10 blur-[140px]" />
      </div>

      <Sidebar sections={sidebarSections} /> {/* fixed left column */}

      <div className="ml-60 relative z-10"> {/* z-10 keeps content above the glow layer */}
        <Navbar />
        <main className="px-8 py-10">{children}</main>
      </div>
    </div>
  );
}