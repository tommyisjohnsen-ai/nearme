import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { registerServiceWorker, subscribeToPush } from '../services/notifications';

const AuthContext = createContext(null);

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
    if (!token) {
      setLoading(false);
      return;
    }

    api.me()
      .then(({ user }) => {
        setUser(user);
        const s = initSocket(token);
        registerServiceWorker().then(() => subscribeToPush());
        return s;
      })
      .catch(() => {
        localStorage.removeItem('nearme_token');
      })
      .finally(() => setLoading(false));

    return () => disconnectSocket();
  }, [initSocket]);

  const login = async (email, password) => {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem('nearme_token', token);
    setUser(user);
    const s = initSocket(token);
    await registerServiceWorker();
    await subscribeToPush();
    return { token, user, socket: s };
  };

  const register = async (name, email, password) => {
    const { token, user } = await api.register({ name, email, password });
    localStorage.setItem('nearme_token', token);
    setUser(user);
    const s = initSocket(token);
    await registerServiceWorker();
    await subscribeToPush();
    return { token, user, socket: s };
  };

  const logout = () => {
    localStorage.removeItem('nearme_token');
    disconnectSocket();
    setUser(null);
    setSocket(null);
  };

  const updateUser = (updates) => setUser((u) => ({ ...u, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, socket, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
