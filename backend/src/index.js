require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// Multi-origin CORS: ALLOWED_ORIGINS (comma-separated) + FRONTEND_URL +
// known production domains. Same allowlist applies to Socket.io and HTTP.
const allowedOrigins = [...new Set([
  ...(process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || []),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  'https://aautoma.eu',
  'https://www.aautoma.eu',
  'https://procompliance.online',
  'https://www.procompliance.online',
  'http://localhost:3000',
])];

const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error(`CORS blocked: ${origin}`));
};

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json());

console.log('CORS allowed origins:', allowedOrigins);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// VAPID public key endpoint
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || null });
});

// Initialize Socket.io
initSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`NearMe backend listening on port ${PORT}`);
});
