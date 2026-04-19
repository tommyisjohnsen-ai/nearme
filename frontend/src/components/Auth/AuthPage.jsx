import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './AuthPage.css';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
    } catch (err) {
      setError(err.message || 'Noe gikk galt');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

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

        <h1 className="auth-title">
          {mode === 'login' ? 'Hei igjen 👋' : 'Kom i gang'}
        </h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Logg inn for å se hvem som er i nærheten'
            : 'Opprett konto og del din posisjon'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="field">
              <label>Navn</label>
              <input
                type="text"
                placeholder="Ditt navn"
                value={form.name}
                onChange={set('name')}
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="field">
            <label>E-post</label>
            <input
              type="email"
              placeholder="din@epost.no"
              value={form.email}
              onChange={set('email')}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label>Passord</label>
            <input
              type="password"
              placeholder={mode === 'register' ? 'Minst 6 tegn' : '••••••••'}
              value={form.password}
              onChange={set('password')}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span className="spinner" />
            ) : mode === 'login' ? (
              'Logg inn'
            ) : (
              'Opprett konto'
            )}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? 'Ingen konto?' : 'Har du konto?'}
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          >
            {mode === 'login' ? 'Registrer deg' : 'Logg inn'}
          </button>
        </p>
      </div>
    </div>
  );
}
