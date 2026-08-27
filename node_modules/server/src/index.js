import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5173", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// Serve React frontend (built) - so you only need http://localhost:5000
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// Routes
app.use('/api/stocks', stockRoutes);
app.use('/api/newsletter', newsletterRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/indices', async (req, res) => {
  try {
    const indices = await realtime.getIndices();
    res.json(indices);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Socket.io for "real-time" pushes (polls Yahoo every 5s)
const watchlistSubscriptions = new Map(); // socketId -> [symbols]

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe', async (symbols) => {
    // symbols: ['RELIANCE.NS', 'TCS.NS', '^NSEI']
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

// Poll and broadcast every 3 seconds - real-time feel via Yahoo direct chart
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

// Also broadcast Nifty/Sensex every 5s to all
setInterval(async () => {
  try {
    const indices = await realtime.getIndices();
    io.emit('indices', indices);
  } catch {}
}, 5000);

// Fallback to index.html for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📈 Indian Stock Analyzer ready - NSE/BSE via Yahoo Finance`);
  console.log(`🌐 Open: http://localhost:${PORT} (frontend + API together)`);
  scheduleDailyAt7PM();
});
