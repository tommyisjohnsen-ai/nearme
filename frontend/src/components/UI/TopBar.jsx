import { useAuth } from '../../contexts/AuthContext';
import './TopBar.css';

export default function TopBar({ onToggleUsers }) {
  const { user, logout } = useAuth();

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="var(--accent)" strokeWidth="2" />
          <circle cx="20" cy="20" r="6" fill="var(--accent)" />
          <circle cx="20" cy="20" r="12" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
        </svg>
        <span className="topbar-title">NearMe</span>
      </div>

      <div className="topbar-actions">
        <button className="topbar-btn" onClick={onToggleUsers} title="Brukere">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        </button>

        <div className="topbar-user">
          <div className="topbar-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="topbar-name">{user?.name}</span>
        </div>

        <button className="topbar-btn topbar-logout" onClick={logout} title="Logg ut">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
