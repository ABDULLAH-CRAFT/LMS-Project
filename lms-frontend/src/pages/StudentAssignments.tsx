import ComingSoonPage from '../components/ComingSoonPage'; // shared placeholder component
import { studentSidebarSections } from '../config/studentSidebar'; // student's sidebar config

export default function StudentAssignments() {
  return (
    <ComingSoonPage
      sidebarSections={studentSidebarSections}
      title="Assignments"
      description="Track and submit work for the courses you're enrolled in."
      icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" // same document icon used in the sidebar link
    />
  );
}