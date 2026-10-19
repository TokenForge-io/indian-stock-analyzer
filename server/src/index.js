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
import { apiLimiter } from './middleware/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Behind Render's proxy — trust one hop so req.ip is the real client (needed for rate limits)
app.set('trust proxy', 1);

// Don't let one stray rejection kill the Render dyno
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e?.message || e));
process.on('uncaughtException', (e) => console.error('uncaughtException:', e?.message || e));

// Allowed CORS origins — comma-separated in CLIENT_URL env
// e.g. CLIENT_URL="https://my-app.vercel.app,http://localhost:5173"
const CLIENT_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim().replace(/\/+$/, '')) // strip trailing slashes
  .filter(Boolean);

// Slash-safe CORS check — also auto-allow any *.vercel.app domain
const isAllowed = (origin) => {
  if (!origin) return true; // curl, server-to-server, mobile apps
  const clean = origin.replace(/\/+$/, '');
  return CLIENT_ORIGINS.includes(clean) || clean.endsWith('.vercel.app');
};

const corsOptions = {
  origin(origin, callback) {
    callback(null, isAllowed(origin));
  },
  methods: ['GET', 'POST'],
  credentials: false
};

const io = new Server(httpServer, {
  // Socket.IO cors origin must be (origin, callback) => — returning a boolean hangs the request
  cors: { origin: (origin, callback) => callback(null, isAllowed(origin)), methods: ['GET', 'POST'] }
});

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', apiLimiter);

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
    // Cap subscription size — prevents a single client from triggering hundreds of Yahoo fetches
    const list = Array.isArray(symbols) ? symbols.filter(s => typeof s === 'string').slice(0, 30) : [];
    watchlistSubscriptions.set(socket.id, list);
    console.log(`Subscribed ${socket.id} to`, list);
  });

  socket.on('unsubscribe', () => {
    watchlistSubscriptions.delete(socket.id);
  });

  socket.on('disconnect', () => {
    watchlistSubscriptions.delete(socket.id);
    console.log('Client disconnected:', socket.id);
  });
});

// Poll and broadcast every 3 seconds — re-entrancy guard prevents overlapping ticks
let quotesTickRunning = false;
setInterval(async () => {
  if (quotesTickRunning || watchlistSubscriptions.size === 0) return;
  quotesTickRunning = true;
  try {
    // Fetch quotes per unique symbol set once, then fan out to sockets in parallel
    const entries = [...watchlistSubscriptions.entries()];
    const uniqueSymbols = [...new Set(entries.flatMap(([, symbols]) => Array.isArray(symbols) ? symbols : []))].slice(0, 50);
    if (uniqueSymbols.length) {
      const quotes = await realtime.getQuotes(uniqueSymbols);
      const bySymbol = new Map(quotes.map(q => [q.symbol, q]));
      await Promise.all(entries.map(async ([socketId, symbols]) => {
        const socketQuotes = (Array.isArray(symbols) ? symbols : []).map(s => bySymbol.get(realtime.normalize(s))).filter(Boolean);
        if (socketQuotes.length) io.to(socketId).emit('quotes', socketQuotes);
      }));
    }
  } catch (e) {
    console.error('Poll error', e.message);
  } finally {
    quotesTickRunning = false;
  }
}, 3000);

// Broadcast Nifty/Sensex every 5s to all (skip if still running)
let indicesTickRunning = false;
setInterval(async () => {
  if (indicesTickRunning) return;
  indicesTickRunning = true;
  try {
    const indices = await realtime.getIndices();
    io.emit('indices', indices);
  } catch (e) {
    console.error('Indices poll error', e.message);
  } finally {
    indicesTickRunning = false;
  }
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
  console.log(`🔒 CORS origins: ${CLIENT_ORIGINS.join(', ')} + *.vercel.app fallback`);
  scheduleDailyAt7PM();
});
