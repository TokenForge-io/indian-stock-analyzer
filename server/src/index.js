import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import stockRoutes from './routes/stocks.js';
import newsletterRoutes from './routes/newsletter.js';
import realtime from './services/realtimeService.js';
import { scheduleDailyAt7PM } from './services/newsletterService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Allowed CORS origins — comma-separated in CLIENT_URL env
// e.g. CLIENT_URL="https://my-app.vercel.app,http://localhost:5173"
const CLIENT_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // allow requests with no origin (curl, server-to-server, mobile apps)
    if (!origin || CLIENT_ORIGINS.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST'],
  credentials: false
};

const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGINS, methods: ['GET', 'POST'] }
});

app.use(cors(corsOptions));
app.use(express.json());

// Serve React frontend if built locally (optional — on Render frontend lives on Vercel)
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// API routes
app.use('/api/stocks', stockRoutes);
app.use('/api/newsletter', newsletterRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/indices', async (req, res) => {
  try {
    const indices = await realtime.getIndices();
    res.json(indices);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Socket.io for real-time pushes (polls Yahoo every 3s)
const watchlistSubscriptions = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe', async (symbols) => {
    watchlistSubscriptions.set(socket.id, symbols);
    console.log(`Subscribed ${socket.id} to`, symbols);
  });

  socket.on('unsubscribe', () => {
    watchlistSubscriptions.delete(socket.id);
  });

  socket.on('disconnect', () => {
    watchlistSubscriptions.delete(socket.id);
    console.log('Client disconnected:', socket.id);
  });
});

// Poll and broadcast every 3 seconds
setInterval(async () => {
  for (const [socketId, symbols] of watchlistSubscriptions.entries()) {
    try {
      const quotes = await realtime.getQuotes(symbols);
      io.to(socketId).emit('quotes', quotes);
    } catch (e) {
      console.error('Poll error', e.message);
    }
  }
}, 3000);

// Broadcast Nifty/Sensex every 5s to all
setInterval(async () => {
  try {
    const indices = await realtime.getIndices();
    io.emit('indices', indices);
  } catch {}
}, 5000);

// SPA fallback — only if client/dist exists (local monorepo mode)
if (fs.existsSync(clientDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  // API-only mode (Render): 404 any non-API route
  app.get('*', (req, res) => {
    res.status(404).json({ error: 'Not found. API only — frontend served separately.' });
  });
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`📈 Indian Stock Analyzer ready - NSE/BSE via Yahoo Finance`);
  console.log(`🌐 API: http://localhost:${PORT}/api/health`);
  console.log(`🔒 CORS origins: ${CLIENT_ORIGINS.join(', ')}`);
  scheduleDailyAt7PM();
});
