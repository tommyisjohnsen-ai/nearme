import { io } from 'socket.io-client';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
  socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));
  socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
