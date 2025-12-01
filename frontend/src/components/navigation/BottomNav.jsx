import { useNavigate, useLocation } from 'react-router-dom';
import haptics from '../../utils/haptics';

const navItems = [
  { path: '/journal', label: 'Journal', icon: '📖' },
  { path: '/character', label: 'Hero', icon: '⚔️' },
  { path: '/quests', label: 'Quests', icon: '📜' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="book-tabs">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path === '/journal' && location.pathname === '/');

        return (
          <button
            key={item.path}
            onClick={() => {
              if (!isActive) haptics.lightTap();
              navigate(item.path);
            }}
            className={`book-tab ${isActive ? 'active' : ''}`}
          >
            <span className="text-base mr-1.5">{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
