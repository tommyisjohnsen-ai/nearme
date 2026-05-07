import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { registerServiceWorker, subscribeToPush } from '../services/notifications';

const AuthContext = createContext(null);

export const DEMO_USERS = [
  { label: 'Drogba',   email: 'bruker1@nearme.demo', id: '11111111-1111-1111-1111-111111111111' },
  { label: 'TommyTee', email: 'bruker2@nearme.demo', id: '22222222-2222-2222-2222-222222222222' },
  { label: 'Dottie',   email: 'bruker3@nearme.demo', id: '33333333-3333-3333-3333-333333333333' },
];
const DEMO_PASSWORD = 'Demo1234';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  const initSocket = useCallback((token) => {
    const s = connectSocket(token);
    setSocket(s);
    return s;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('nearme_token');
    if (!token) { setLoading(false); return; }

    // Lokal demo-token? Last bruker rett fra localStorage, ikke kall backend.
    if (token.startsWith('local-demo-')) {
      const stored = localStorage.getItem('nearme_local_user');
      if (stored) {
        try { setUser(JSON.parse(stored)); } catch {}
      }
      setLoading(false);
      return;
    }

    api.me()
      .then(({ user }) => {
        setUser(user);
        const s = initSocket(token);
        registerServiceWorker().then(() => subscribeToPush()).catch(() => {});
        return s;
      })
      .catch(() => localStorage.removeItem('nearme_token'))
      .finally(() => setLoading(false));
    return () => disconnectSocket();
  }, [initSocket]);

  const login = async (email, password) => {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem('nearme_token', token);
    setUser(user);
    const s = initSocket(token);
    try { await registerServiceWorker(); await subscribeToPush(); } catch {}
    return { token, user, socket: s };
  };

  const register = async (name, email, password) => {
    const { token, user } = await api.register({ name, email, password });
    localStorage.setItem('nearme_token', token);
    setUser(user);
    const s = initSocket(token);
    try { await registerServiceWorker(); await subscribeToPush(); } catch {}
    return { token, user, socket: s };
  };

  // Demo-login: prøv ekte backend først. Hvis backend svarer 502 / nettverk
  // feiler → fall tilbake til lokal demo-modus så brukeren kommer inn på
  // kartet uansett. Chat fungerer ikke uten backend, men resten gjør det.
  const loginAsDemo = async (email) => {
    try {
      return await login(email, DEMO_PASSWORD);
    } catch (err) {
      const msg = String(err?.message || '');
      const isNetwork = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('502');
      if (!isNetwork) throw err;
      // Bygg en lokal sesjon som matcher seed-bruker UUID-en (fungerer hvis
      // backend kommer opp senere — samme ID brukes).
      const seed = DEMO_USERS.find((u) => u.email === email);
      if (!seed) throw err;
      const fakeUser = {
        id: seed.id,
        name: seed.label,
        email: seed.email,
        avatar_url: null,
        is_sharing_location: true,
        created_at: new Date().toISOString(),
      };
      const fakeToken = `local-demo-${seed.id}`;
      localStorage.setItem('nearme_token', fakeToken);
      localStorage.setItem('nearme_local_user', JSON.stringify(fakeUser));
      setUser(fakeUser);
      console.warn('[auth] Backend nede — kjører i lokal demo-modus');
      return { token: fakeToken, user: fakeUser, socket: null };
    }
  };

  const logout = () => {
    localStorage.removeItem('nearme_token');
    disconnectSocket();
    setUser(null);
    setSocket(null);
  };

  const updateUser = (updates) => setUser((u) => ({ ...u, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, socket, login, register, loginAsDemo, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
