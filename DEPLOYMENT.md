# Deployment Guide — Indian Stock Analyzer

Deploy frontend (Vercel) + backend (Render) as two free services.

## Architecture

```
Vercel (frontend)  ──HTTP/Socket.IO──►  Render (backend API)
https://your-app.vercel.app            https://your-api.onrender.com
```

---

## Step 1 — Push to GitHub

```powershell
cd "C:\New folder (7)"
git add .
git commit -m "Indian Stock Analyzer — deployment ready"
git remote add origin https://github.com/YOUR_USERNAME/indian-stock-analyzer.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Deploy Backend (Render)

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Settings:
   | Field | Value |
   |-------|-------|
   | Name | `indian-stock-analyzer` (or any name) |
   | Root Directory | `server` |
   | Build Command | `npm install` |
   | Start Command | `node src/index.js` |
   | Instance Type | **Free** |
4. **Environment** → Add these variables:

   | Key | Value |
   |-----|-------|
   | `CLIENT_URL` | `https://YOUR-VERCEL-APP.vercel.app` |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | `aistockanalyzer.io@gmail.com` |
   | `SMTP_PASS` | `YOUR_GMAIL_APP_PASSWORD` |
   | `SMTP_FROM` | `Indian Stock Analyzer <aistockanalyzer.io@gmail.com>` |
   | `SMTP_SECURE` | `false` |

5. Click **Create Web Service** → wait for deploy (~2 min)
6. Note your URL: `https://indian-stock-analyzer-xxxx.onrender.com`
7. Test: `https://indian-stock-analyzer-xxxx.onrender.com/api/health` → should return `{"status":"ok"}`

> **Note:** Render free tier sleeps after 15 min of inactivity. First request after sleep takes ~30s to wake up.

---

## Step 3 — Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repo
3. Settings:
   | Field | Value |
   |-------|-------|
   | Root Directory | `client` |
   | Framework Preset | **Vite** (auto-detected) |
   | Build Command | `npm run build` (auto) |
   | Output Directory | `dist` (auto) |
4. **Environment Variables** → Add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://indian-stock-analyzer-xxxx.onrender.com` |

   > Use your **actual Render URL** from Step 2. No trailing slash.

5. Click **Deploy** → wait (~1 min)
6. Note your URL: `https://indian-stock-analyzer.vercel.app`

---

## Step 4 — Link Frontend URL back to Render

1. Go back to **Render** → your service → **Environment**
2. Update `CLIENT_URL` to your Vercel URL:
   ```
   CLIENT_URL=https://indian-stock-analyzer.vercel.app
   ```
3. **Save** → Render auto-redeploys

---

## Step 5 — Verify

Open your Vercel URL. Test:

- [ ] Homepage loads with Matrix rain + glow
- [ ] Search `RELIANCE` → chart shows data
- [ ] Search `TATAMOTORS` → auto-resolves to TMCV.NS
- [ ] Chart toggle Candle/Line works
- [ ] Timeframe pills 1W-5Y work
- [ ] Indices bar shows Nifty/Sensex live
- [ ] Top Movers shows 5 Gainers + 5 Losers
- [ ] Top AI Picks page opens
- [ ] Watchlist add/remove works
- [ ] Newsletter subscribe works
- [ ] Browser console: no CORS errors

---

## Environment Variables Reference

### Server (Render dashboard → Environment)

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | Auto | Render sets this automatically |
| `CLIENT_URL` | **Yes** | Vercel URL for CORS. Comma-separated if multiple |
| `SMTP_HOST` | Optional | Gmail SMTP for newsletter |
| `SMTP_PORT` | Optional | `587` |
| `SMTP_USER` | Optional | Gmail address |
| `SMTP_PASS` | Optional | Gmail App Password (16-char) |
| `SMTP_FROM` | Optional | Display name + email |
| `SMTP_SECURE` | Optional | `false` for port 587 |

### Client (Vercel dashboard → Settings → Environment Variables)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_API_URL` | **Yes** | Render backend URL (no trailing slash) |

> **No secrets go in client env.** `VITE_API_URL` is a public URL only.

---

## Gmail App Password Setup (for newsletter)

1. Go to [myaccount.google.com](https://myaccount.google.com) → **Security**
2. Enable **2-Step Verification** (required first)
3. Search **App Passwords** → create → name it "StockAnalyzer"
4. Copy the 16-char password → paste as `SMTP_PASS` in Render

Without SMTP, newsletter emails are logged to Render console only (mock mode).

---

## Local Development (unchanged)

```powershell
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
cd client
npm run dev
```

Open `http://localhost:5173` — Vite proxy forwards `/api` and `/socket.io` to `localhost:5000`.

Or single URL (serves built frontend from backend):
```powershell
cd server
npm start
```
Open `http://localhost:5000`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error in browser | Set `CLIENT_URL` on Render to exact Vercel URL (check protocol `https://`) |
| Socket.IO not connecting | Ensure `VITE_API_URL` set in Vercel, redeploy frontend |
| Render sleeps after inactivity | Free tier limitation — first request wakes it (~30s) |
| Newsletter not sending | Check Render logs for SMTP errors; verify App Password |
| `npm install` fails on Render | Ensure `package.json` is in `server/` root directory setting |
| Port error on Render | Don't set `PORT` env — Render injects it automatically |
