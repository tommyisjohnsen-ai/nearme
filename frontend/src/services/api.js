const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('nearme_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
  setSharing: (isSharing) =>
    request('/api/auth/sharing', { method: 'PATCH', body: JSON.stringify({ isSharing }) }),

  // Users
  getUsers: () => request('/api/users'),
  savePushSubscription: (subscription) =>
    request('/api/users/push-subscription', { method: 'POST', body: JSON.stringify({ subscription }) }),

  // Messages
  getMessages: (userId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/messages/${userId}${qs ? '?' + qs : ''}`);
  },
  getConversations: () => request('/api/messages'),

  // VAPID key
  getVapidKey: () => request('/api/vapid-public-key'),
};
