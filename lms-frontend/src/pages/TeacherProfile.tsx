import ProfilePage from '../components/ProfilePage'; // shared component
import { teacherSidebarSections } from '../config/teacherSidebar'; // teacher's sidebar config

export default function TeacherProfile() {
  return <ProfilePage sidebarSections={teacherSidebarSections} variant="teacher" />; // CHANGED — teacher variant: teaching stats, no student XP/streak/level
}
