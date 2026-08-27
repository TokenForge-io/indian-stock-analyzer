# Indian Stock Analyzer 🇮🇳

Real-time NSE/BSE stock analysis tool - **React + Node.js + Yahoo Finance**

> **Data Source:** `yahoo-finance2` with `.NS` (NSE) / `.BO` (BSE) symbols - FREE, no API key, ~1-5 min delay (Yahoo). Pluggable for true real-time via Angel One / Upstox WebSocket later.

## Features

- **Real-time Prices:** NIFTY 50, SENSEX, Bank Nifty + any NSE stock (RELIANCE.NS, TCS.NS, INFY.NS)
- **Technical Analysis:** RSI, MACD, SMA/EMA (9,20,50,200), Bollinger Bands, Volume, Support/Resistance
- **Fundamental:** P/E, EPS, Market Cap, 52W High/Low, Dividend Yield (from Yahoo quoteSummary)
- **Screener:** Filter by price, volume, P/E, market cap
- **Charts:** Candlestick + indicators (TradingView lightweight-charts)
- **Watchlist + Alerts:** Local storage + backend polling
- **Top Movers:** Nifty gainers/losers

## Quick Start

```bash
# 1. Install
npm run install:all

# 2. Run both frontend + backend
npm run dev

# Frontend: http://localhost:5173
# Backend:  http://localhost:5000
```

## Project Structure

```
server/  -> Express + yahoo-finance2 + Socket.io (polls every 5s)
client/  -> React + Vite + Tailwind + Recharts
```

## Real-time Upgrade Path

This version uses **polling** (Yahoo has no WebSocket). For *true tick-by-tick*:

1. Get free API keys from **Angel One SmartAPI** (smartapi.angelbroking.com) - FREE
2. Uncomment `services/angelOne.js` in server and set `ANGEL_API_KEY` in `.env`
3. Frontend needs NO change - it already uses WebSocket

See `server/.env.example`
