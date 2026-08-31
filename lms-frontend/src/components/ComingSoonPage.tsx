import DashboardLayout from './DashboardLayout'; // sidebar + navbar shell
import type { SidebarSection } from './Sidebar'; // sidebar config type

interface ComingSoonPageProps {
  sidebarSections: SidebarSection[]; // passed in by whichever page uses this
  title: string; // page heading, e.g. "Assignments"
  description: string; // short explanation of what's coming
  icon: string; // SVG path data for the illustration
}

export default function ComingSoonPage({ sidebarSections, title, description, icon }: ComingSoonPageProps) {
  return (
    <DashboardLayout sidebarSections={sidebarSections}>
      <h1 className="text-3xl font-bold text-white mb-1">{title}</h1> {/* page heading, matches every other page's style */}
      <p className="text-gray-500 mb-8">{description}</p>

      <div className="bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-xl p-12 max-w-lg text-center"> {/* glass card, larger padding since it's the only content on the page */}
        <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4"> {/* icon circle, purple accent matches theme */}
          <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <p className="text-white font-medium mb-1">Coming soon</p> {/* honest, not a fake empty state pretending to be a real feature */}
        <p className="text-sm text-gray-500">This feature is on the roadmap and isn't built yet.</p>
      </div>
    </DashboardLayout>
  );
}