import { useState } from 'react';
import { useAuth, DEMO_USERS } from '../../contexts/AuthContext';
import './AuthPage.css';

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
      setError(err.message || 'Noe gikk galt');
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
            <circle cx="20" cy="20" r="18" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="20" cy="20" r="6" fill="var(--accent)" />
            <circle cx="20" cy="20" r="12" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
          </svg>
          <span className="auth-logo-text">NearMe</span>
        </div>

        <h1 className="auth-title">Velg bruker 👋</h1>
        <p className="auth-subtitle">Demo-modus — alle tre kan se hverandre på kartet</p>

        <div className="auth-form" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
          {DEMO_USERS.map((u) => (
            <button
              key={u.email}
              type="button"
              className="btn-primary"
              onClick={() => pickUser(u.email)}
              disabled={loading !== null}
            >
              {loading === u.email ? <span className="spinner" /> : `Logg inn som ${u.label}`}
            </button>
          ))}
          {error && <div className="auth-error">{error}</div>}
        </div>

        <p className="auth-switch" style={{ marginTop: '20px', fontSize: '12px', opacity: 0.6 }}>
          Tre forhåndsdefinerte brukere. Velg én — del posisjon — chat med de andre.
        </p>
      </div>
    </div>
  );
}
