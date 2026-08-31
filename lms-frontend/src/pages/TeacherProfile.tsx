import ProfilePage from '../components/ProfilePage'; // shared component
import { teacherSidebarSections } from '../config/teacherSidebar'; // teacher's sidebar config

export default function TeacherProfile() {
  return <ProfilePage sidebarSections={teacherSidebarSections} />; // same shared component as StudentProfile, different sidebar
}