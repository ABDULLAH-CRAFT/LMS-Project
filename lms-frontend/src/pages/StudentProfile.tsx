import ProfilePage from '../components/ProfilePage'; // shared component
import { studentSidebarSections } from '../config/studentSidebar'; // student's sidebar config

export default function StudentProfile() {
  return <ProfilePage sidebarSections={studentSidebarSections} />; // only difference from TeacherProfile is which sidebar gets passed in
}