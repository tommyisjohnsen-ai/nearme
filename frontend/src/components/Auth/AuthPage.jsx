import { useState } from 'react';
import { useAuth, DEMO_USERS } from '../../contexts/AuthContext';
import './AuthPage.css';

const SLOT_HINTS = [
  'Del posisjon, se de andre på kartet',
  'Send meldinger i sanntid',
  'Få varsel når noen er i nærheten',
];

export default function AuthPage() {
  const { loginAsDemo } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(null);

  const pickUser = async (email) => {
    setError('');
    setLoading(email);
    try {
      await loginAsDemo(email);
    } catch (err) {
      setError(err.message || 'Backend offline — prøv igjen om litt');
      setLoading(null);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />
        <div className="auth-grid" />
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="#4a8eff" strokeWidth="2" />
            <circle cx="20" cy="20" r="6" />
            <circle cx="20" cy="20" r="12" stroke="#4a8eff" strokeWidth="1" opacity="0.4" />
          </svg>
          <span className="auth-logo-text">NearMe</span>
        </div>

        <h1 className="auth-title">Hvem er du i kveld?</h1>
        <p className="auth-subtitle">
          Tre plasser. Velg én. Del posisjon. Snakk med de andre i sanntid.
        </p>

        <div className="slots">
          {DEMO_USERS.map((u, i) => {
            const num = i + 1;
            const isLoading = loading === u.email;
            return (
              <button
                key={u.email}
                type="button"
                className="slot"
                data-slot={num}
                data-loading={isLoading}
                onClick={() => pickUser(u.email)}
                disabled={loading !== null}
              >
                <span className="slot-num">{`0${num}`}</span>
                <div className="slot-icon">{num}</div>
                <span className="slot-label">{u.label}</span>
                <span className="slot-hint">{SLOT_HINTS[i]}</span>
                <span className="slot-status">Slot ledig</span>
                <span className="slot-arrow">
                  {isLoading ? (
                    <span className="spinner" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-features">
          <div className="auth-feature">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            Sanntids GPS
          </div>
          <div className="auth-feature">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            Direkte chat
          </div>
          <div className="auth-feature">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>
            </svg>
            Push-varsel
          </div>
          <div className="auth-feature">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>
            </svg>
            PWA — kan installeres
          </div>
        </div>
      </div>
    </div>
  );
}
