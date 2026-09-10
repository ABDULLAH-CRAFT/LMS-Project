import { useState } from 'react'; // local toggle state
import { useNavigate } from 'react-router-dom'; // used for the logout-everywhere action
import DashboardLayout from '../components/DashboardLayout'; // sidebar + navbar shell
import { studentSidebarSections } from '../config/studentSidebar'; // student's sidebar config

const SETTINGS_KEY = 'lms-notification-settings'; // localStorage key — namespaced so it doesn't collide with anything else

interface NotificationSettings { // shape of what gets persisted
  courseUpdates: boolean;
  enrollmentConfirmations: boolean;
  marketingEmails: boolean;
}

function loadSettings(): NotificationSettings { // reads saved settings, or returns sensible defaults if nothing's saved yet
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to defaults if parsing fails for any reason
  }
  return { courseUpdates: true, enrollmentConfirmations: true, marketingEmails: false }; // reasonable defaults — opted into important ones, opted out of marketing
}

export default function StudentSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings); // loadSettings runs once, on first render, via useState's lazy initializer
  const [saved, setSaved] = useState(false); // brief "Saved" confirmation flag

  const toggle = (key: keyof NotificationSettings) => { // flips one setting and persists immediately
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)); // persist right away — no separate "Save" step needed for toggles
    setSaved(true);
    setTimeout(() => setSaved(false), 2000); // clears the confirmation message after 2 seconds
  };

  const handleLogoutEverywhere = () => { // clears local session — a real "log out of all devices" would need a backend token-revocation list, which doesn't exist yet, so this is scoped honestly to just this device
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.dispatchEvent(new Event('auth-changed'));
    navigate('/login');

  };

  return (
    <DashboardLayout sidebarSections={studentSidebarSections}>
      <h1 className="text-3xl font-bold text-white mb-1">Settings</h1> {/* page heading */}
      <p className="text-gray-500 mb-8">Manage your notification preferences and account.</p>

      {/* NOTIFICATIONS */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-xl p-6 mb-6 max-w-lg"> {/* glass card */}
        <div className="flex items-center justify-between mb-4"> {/* header row with the "Saved" confirmation */}
          <h2 className="font-medium text-white">Notifications</h2>
          {saved && <span className="text-xs text-green-400">Saved</span>} {/* brief confirmation, fades via the timeout above */}
        </div>

        {[ // array-driven so adding a new toggle later is one line, not copy-pasted markup
          { key: 'courseUpdates' as const, label: 'Course updates', description: 'New lessons added to courses you\'re enrolled in' },
          { key: 'enrollmentConfirmations' as const, label: 'Enrollment confirmations', description: 'Email confirmation when you enroll in a course' },
          { key: 'marketingEmails' as const, label: 'Marketing emails', description: 'Occasional updates about new features and courses' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-b-0"> {/* last:border-b-0 removes the divider after the final row */}
            <div>
              <p className="text-sm text-white">{item.label}</p>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
            <button
              onClick={() => toggle(item.key)} // flips this specific setting
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                settings[item.key] ? 'bg-gradient-to-r from-purple-600 to-cyan-400' : 'bg-white/10' // gradient when on, dim when off — matches theme
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings[item.key] ? 'translate-x-5' : 'translate-x-0' // slides the toggle knob right when enabled
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* ACCOUNT / DANGER ZONE */}
      <div className="bg-white/[0.03] border border-red-500/20 rounded-2xl backdrop-blur-xl p-6 max-w-lg"> {/* red-tinted border signals this is a caution zone */}
        <h2 className="font-medium text-white mb-1">Account</h2>
        <p className="text-xs text-gray-500 mb-4">Manage your session on this device.</p>
        <button
          onClick={handleLogoutEverywhere}
          className="text-sm text-red-400 border border-red-500/30 px-4 py-2 rounded-lg hover:bg-red-500/10 transition"
        >
          Log out
        </button>
      </div>
    </DashboardLayout>
  );
}