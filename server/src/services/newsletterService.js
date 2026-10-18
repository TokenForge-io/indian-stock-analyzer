import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import nodemailer from 'nodemailer'
import cron from 'node-cron'
import aiPicksService from './aiPicksService.js'
import realtime from './realtimeService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_FILE = path.join(__dirname, '../data/newsletter.json')

function ensureFile(){
  try{
    const dir = path.dirname(DATA_FILE)
    if(!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true})
    if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]')
  }catch{}
}
ensureFile()

function loadEmails(){
  try{
    ensureFile()
    return JSON.parse(fs.readFileSync(DATA_FILE,'utf-8'))
  }catch{ return [] }
}
function saveEmails(list){
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2))
}

export function addEmail(email){
  const clean = String(email).trim().toLowerCase()
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Invalid email')
  const list = loadEmails()
  if(list.includes(clean)) return { already: true, count: list.length }
  list.push(clean)
  saveEmails(list)
  return { already: false, count: list.length }
}
export function removeEmail(email){
  const clean = String(email).trim().toLowerCase()
  const list = loadEmails()
  const next = list.filter(e=>e!==clean)
  saveEmails(next)
  return { removed: list.length !== next.length, count: next.length }
}
export function getEmails(){ return loadEmails() }
export function getCount(){ return loadEmails().length }

function createTransport(){
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if(!host || !user || !pass){
    console.log('📧 SMTP not configured — emails will be logged to console (set SMTP_HOST/USER/PASS to send real emails)')
    return null
  }
  // Try port 465 SSL first (port 587 often blocked from cloud IPs), fallback to env port
  const port = Number(process.env.SMTP_PORT || 465)
  const secure = port === 465 || process.env.SMTP_SECURE === 'true'
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000
  })
}

// Resend API — works from any server (Render/Vercel/AWS), no SMTP needed
// Free: 3,000 emails/month — https://resend.com
async function sendViaResend({ from, to, subject, html }){
  const apiKey = process.env.RESEND_API_KEY
  if(!apiKey) return null
  const fromAddr = process.env.RESEND_FROM || 'onboarding@resend.dev'
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromAddr, to: [to], subject, html })
  })
  if(!r.ok){
    const err = await r.text().catch(()=>r.statusText)
    throw new Error(`Resend API ${r.status}: ${err}`)
  }
  return r.json()
}

// EmailJS API — free 200/month, sends to ANY email, no domain verification needed
// Setup: https://dashboard.emailjs.com → Email Services (add Gmail) → Email Templates
async function sendViaEmailJS({ to, subject, html }){
  const serviceId = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_TEMPLATE_ID
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY
  if(!serviceId || !templateId || !publicKey) return null
  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: to,
      subject,
      html_content: html
    }
  }
  if(privateKey) payload.accessToken = privateKey
  const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if(!r.ok){
    const err = await r.text().catch(()=>r.statusText)
    throw new Error(`EmailJS ${r.status}: ${err}`)
  }
  return { ok: true }
}

// Compact portfolio HTML for EmailJS (50KB payload limit) — uses <style> block instead of inline styles
function portfolioHtmlCompact(picks, indices=[], movers={gainers:[], losers:[]}, summary=''){
  const stockRow = (s,i)=>`<tr>
    <td class="num">${i+1}</td>
    <td><b>${s.symbol}</b><div class="sub">${s.verdict||''} • Score ${s.score}/100 • RSI ${s.rsi?.toFixed(0)||'-'} • P/E ${s.pe||'-'} • ROE ${s.roe||'-'}%</div></td>
    <td class="num">₹${s.price?.toFixed(0)}</td>
    <td class="num blue">₹${s.target?.toFixed(0)}</td>
    <td class="num ${s.upside>=0?'grn':'red'}">${s.upside>=0?'+':''}${s.upside?.toFixed(1)}%</td>
  </tr>${s.summary||s.pros?.length?`<tr><td colspan="5" class="detail">${s.summary?`<b>Why:</b> ${s.summary.slice(0,140)}${s.summary.length>140?'...':''}`:''}${s.pros?.length?`<div class="grn">✓ ${s.pros.slice(0,3).join(' • ')}</div>`:''}${s.cons?.length?`<div class="red">✕ ${s.cons.slice(0,2).join(' • ')}</div>`:''}</td></tr>`:''}`
  const tbl = (title,list,color)=>`<h3 style="color:${color}">${title}</h3>
    <table><thead><tr><th>#</th><th>Stock</th><th class="num">Price</th><th class="num">Target 12M</th><th class="num">Upside</th></tr></thead>
    <tbody>${list.map(stockRow).join('')}</tbody></table>`
  const idx = indices.length?`<div class="box"><h3>📈 Market Indices</h3><table><thead><tr><th>Index</th><th class="num">Price</th><th class="num">Change</th></tr></thead><tbody>${indices.map(i=>`<tr><td><b>${i.name}</b></td><td class="num">${i.price?.toFixed(2)}</td><td class="num ${i.change>=0?'grn':'red'}">${i.change>=0?'+':''}${i.change?.toFixed(2)} (${i.changePercent?.toFixed(2)}%)</td></tr>`).join('')}</tbody></table></div>`:''
  const moversHtml = movers.gainers?.length?`<div class="box"><h3>🔥 Top Movers</h3><table><thead><tr><th colspan="2" class="grn">Top Gainers</th><th colspan="2" class="red">Top Losers</th></tr></thead><tbody>${Array.from({length:5},(_,i)=>{const g=movers.gainers[i],l=movers.losers?.[i];return `<tr><td><b>${g?g.symbol.replace('.NS',''):''}</b></td><td class="num grn">${g?'+'+(g.regularMarketChangePercent?.toFixed(2))+'%':''}</td><td><b>${l?l.symbol.replace('.NS',''):''}</b></td><td class="num red">${l?(l.regularMarketChangePercent?.toFixed(2))+'%':''}</td></tr>`}).join('')}</tbody></table></div>`:''
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;background:#0f141a;color:#d1d4dc;margin:0;padding:0}
    .wrap{max-width:640px;margin:0 auto;padding:20px}
    h1{color:#2962FF;font-size:22px;margin:0 0 4px}
    h2{color:#d1d4dc;font-size:18px}
    h3{font-size:15px;margin:20px 0 8px;border-bottom:1px solid #2a2e39;padding-bottom:4px}
    .sub{color:#787b86;font-size:11px;font-weight:normal}
    .box{background:#131722;border:1px solid #2a2e39;border-radius:8px;padding:12px;margin:12px 0}
    table{width:100%;border-collapse:collapse;background:#1e222d;font-size:12px;margin:0 0 4px}
    th{background:#131722;color:#787b86;font-size:11px;padding:6px;text-align:left;border:1px solid #2a2e39}
    td{padding:7px 8px;border:1px solid #2a2e39;vertical-align:top}
    .num{text-align:right;font-family:monospace}
    .grn{color:#089981}.red{color:#F23645}.blue{color:#2962FF}
    .detail{background:#131722;font-size:11px;color:#a1a6b5;line-height:1.5}
    .meta{color:#787b86;font-size:11px}
    .summary{background:#131722;border:1px solid #2a2e39;border-radius:8px;padding:12px;font-size:12px;line-height:1.6;color:#a1a6b5}
  </style></head><body><div class="wrap">
    <h1>Indian Stock Analyzer — AI Portfolio</h1>
    <p class="meta">Deep scan of 2,000 NSE stocks • ${new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST • Not SEBI advice</p>
    <div class="summary"><b style="color:#d1d4dc">📊 Market Summary:</b> ${summary||`AI scanned ${picks.scanned||2000} stocks. Steady (low vol, high ROE), Mid (balanced), Aggressive (high upside).`}</div>
    ${idx}${moversHtml}
    <p class="meta">Your AI portfolio — <b>Top 30</b> (10 Steady / 10 Mid / 10 Aggressive) picked after deep scan.</p>
    ${tbl('🟢 Steady Growth — 10 Stocks',picks.steady||[], '#089981')}
    ${tbl('🟡 Mid Growth — 10 Stocks',picks.mid||[], '#f59e0b')}
    ${tbl('🟠 Aggressive Growth — 10 Stocks',picks.aggressive||[], '#F23645')}
    <p class="meta">Sources: Yahoo Finance • Screener.in • NSE India • Broker consensus • Not SEBI registered</p>
  </div></body></html>`
}

// Unified email sender — priority: EmailJS (any email) → Resend → SMTP (localhost)
async function sendEmail({ to, subject, html, htmlCompact }){
  console.log(`📧 Email to ${to}: html=${html.length} chars (${(html.length/1024).toFixed(1)}KB)`)
  // 1. EmailJS — works for ANY recipient, no domain verification (50KB limit)
  if(process.env.EMAILJS_SERVICE_ID){
    console.log(`📧 Sending via EmailJS to ${to}...`)
    // EmailJS rejects >50KB — use compact version if provided and too big
    let payload = html
    if(payload.length > 45000 && htmlCompact){
      console.log(`📧 HTML too large for EmailJS (${payload.length} chars) — using compact version (${htmlCompact.length} chars)`)
      payload = htmlCompact
    }
    await sendViaEmailJS({ to, subject, html: payload })
    console.log(`📧 EmailJS sent to ${to}`)
    return { method: 'emailjs' }
  }
  // 2. Resend — works if domain verified
  if(process.env.RESEND_API_KEY){
    console.log(`📧 Sending via Resend API to ${to}...`)
    const from = process.env.SMTP_FROM || process.env.SMTP_USER
    const r = await sendViaResend({ from, to, subject, html })
    console.log(`📧 Resend sent to ${to}:`, r?.id || 'ok')
    return { method: 'resend', id: r?.id }
  }
  // 3. SMTP — works on localhost
  const transporter = createTransport()
  if(!transporter){
    console.log(`📧 [MOCK] Would send to ${to}`)
    return { method: 'mock', mock: true }
  }
  try{
    const from = process.env.SMTP_FROM || process.env.SMTP_USER
    await transporter.sendMail({ from, to, subject, html })
    console.log(`📧 SMTP sent to ${to}`)
    return { method: 'smtp' }
  } catch(e){
    // SMTP failed (blocked from cloud) — try API fallbacks
    if(process.env.EMAILJS_SERVICE_ID){
      console.log(`📧 SMTP failed (${e.message}) — trying EmailJS...`)
      await sendViaEmailJS({ to, subject, html })
      return { method: 'emailjs-fallback' }
    }
    if(process.env.RESEND_API_KEY){
      console.log(`📧 SMTP failed (${e.message}) — trying Resend...`)
      const r = await sendViaResend({ from, to, subject, html })
      return { method: 'resend-fallback', id: r?.id }
    }
    throw e
  }
}

function portfolioHtml(picks, indices=[], movers={gainers:[], losers:[]}, summary=''){
  const stockBlock = (s,i)=> {
    const why = s.summary ? `<div style="margin:4px 0 2px;color:#d1d4dc;font-size:11px;line-height:1.4"><b>Why:</b> ${s.summary.slice(0,180)}${s.summary.length>180?'...':''}</div>` : ''
    const pros = s.pros?.length ? `<div style="color:#089981;font-size:11px"><b>✓ Pros:</b> ${s.pros.slice(0,3).join(' • ')}</div>` : ''
    const cons = s.cons?.length ? `<div style="color:#F23645;font-size:11px"><b>✕ Cons:</b> ${s.cons.slice(0,2).join(' • ')}</div>` : ''
    const meta = `<div style="color:#787b86;font-size:10px;font-family:monospace;margin-top:4px">Score ${s.score}/100 • RSI ${s.rsi?.toFixed(1)} • P/E ${s.pe||'-'} • ROE ${s.roe||'-'}% • Timeframe 12M • Sources: Yahoo • Screener.in • NSE • Broker target</div>`
    return `<tr>
      <td style="padding:8px;border:1px solid #2a2e39;font-family:monospace;font-size:12px">${i+1}</td>
      <td style="padding:8px;border:1px solid #2a2e39;font-family:sans-serif;font-size:12px"><b>${s.symbol}</b><br/><span style="color:#787b86;font-size:11px">${s.verdict} • ${s.score}/100</span></td>
      <td style="padding:8px;border:1px solid #2a2e39;font-family:monospace;text-align:right">₹${s.price?.toFixed(0)}</td>
      <td style="padding:8px;border:1px solid #2a2e39;font-family:monospace;text-align:right;color:#2962FF">₹${s.target?.toFixed(0)}</td>
      <td style="padding:8px;border:1px solid #2a2e39;text-align:right;color:${s.upside>=0?'#089981':'#F23645'}">+${s.upside?.toFixed(1)}%</td>
    </tr>
    <tr><td colspan="5" style="padding:6px 8px 8px 8px;border:1px solid #2a2e39;background:#131722">${why}${pros}${cons}${meta}</td></tr>`
  }
  const table = (title, list, color) => `
    <h3 style="color:${color};font-family:sans-serif;margin:18px 0 8px">${title} — 10 Stocks <span style="color:#787b86;font-size:11px;font-weight:normal">• Timeframe 12M • Sources: Yahoo/Screener/NSE/Broker</span></h3>
    <table style="width:100%;border-collapse:collapse;background:#1e222d;border:1px solid #2a2e39">
      <thead><tr style="background:#131722;color:#787b86;font-size:11px"><th style="padding:6px;text-align:left">#</th><th style="padding:6px;text-align:left">Stock (hover ⓘ in app)</th><th style="padding:6px;text-align:right">Price</th><th style="padding:6px;text-align:right">Target 12M</th><th style="padding:6px;text-align:right">Upside</th></tr></thead>
      <tbody>${list.map(stockBlock).join('')}</tbody>
    </table>`
  const indicesHtml = indices.length ? `
    <h3 style="color:#d1d4dc;font-family:sans-serif;margin:16px 0 8px">📈 Market Indices — Live</h3>
    <table style="width:100%;border-collapse:collapse;background:#1e222d;border:1px solid #2a2e39">
      <thead><tr style="background:#131722;color:#787b86;font-size:11px"><th style="padding:6px;text-align:left">Index</th><th style="padding:6px;text-align:right">Price</th><th style="padding:6px;text-align:right">Change</th></tr></thead>
      <tbody>${indices.map(idx=>`<tr><td style="padding:6px;font-size:12px;font-weight:bold">${idx.name}</td><td style="padding:6px;text-align:right;font-family:monospace">${idx.price?.toFixed(2)}</td><td style="padding:6px;text-align:right;color:${idx.change>=0?'#089981':'#F23645'}">${idx.change>=0?'+':''}${idx.change?.toFixed(2)} (${idx.changePercent?.toFixed(2)}%)</td></tr>`).join('')}</tbody>
    </table>` : ''
  const moversHtml = (movers.gainers?.length || movers.losers?.length) ? `
    <h3 style="color:#d1d4dc;font-family:sans-serif;margin:16px 0 8px">🔥 Top Movers — Today</h3>
    <div style="display:flex;gap:12px">
      <div style="flex:1;background:#1e222d;border:1px solid #2a2e39;padding:8px">
        <p style="color:#089981;font-size:11px;font-weight:bold;margin:0 0 6px">Top 5 Gainers</p>
        <table style="width:100%;font-size:11px"><thead><tr style="color:#787b86"><th style="text-align:left">#</th><th style="text-align:left">Symbol</th><th style="text-align:right">Price</th><th style="text-align:right">Change</th></tr></thead><tbody>${(movers.gainers||[]).slice(0,5).map((q,i)=>`<tr><td>${i+1}</td><td><b>${q.symbol.replace('.NS','')}</b></td><td style="text-align:right">₹${q.regularMarketPrice?.toFixed(2)}</td><td style="text-align:right;color:#089981">+${q.regularMarketChangePercent?.toFixed(2)}%</td></tr>`).join('')}</tbody></table>
      </div>
      <div style="flex:1;background:#1e222d;border:1px solid #2a2e39;padding:8px">
        <p style="color:#F23645;font-size:11px;font-weight:bold;margin:0 0 6px">Top 5 Losers</p>
        <table style="width:100%;font-size:11px"><thead><tr style="color:#787b86"><th style="text-align:left">#</th><th style="text-align:left">Symbol</th><th style="text-align:right">Price</th><th style="text-align:right">Change</th></tr></thead><tbody>${(movers.losers||[]).slice(0,5).map((q,i)=>`<tr><td>${i+1}</td><td><b>${q.symbol.replace('.NS','')}</b></td><td style="text-align:right">₹${q.regularMarketPrice?.toFixed(2)}</td><td style="text-align:right;color:#F23645">${q.regularMarketChangePercent?.toFixed(2)}%</td></tr>`).join('')}</tbody></table>
      </div>
    </div>` : ''
  return `
  <div style="font-family:sans-serif;background:#0f141a;color:#d1d4dc;padding:24px;max-width:640px;margin:auto">
    <h1 style="color:#2962FF;margin:0">Indian Stock Analyzer — Daily Market & AI Portfolio</h1>
    <p style="color:#787b86;font-size:12px;margin:4px 0 16px">Deep scan of 2,000 NSE stocks • ${new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})} IST • Not SEBI advice</p>
    <div style="background:#131722;border:1px solid #2a2e39;padding:12px;margin-bottom:12px">
      <h3 style="margin:0;color:#d1d4dc">📊 Market Summary</h3>
      <p style="font-size:12px;color:#a1a6b5;line-height:1.5;margin:6px 0 0">${summary || `Market closed. AI scanned ${picks.scanned||30} stocks from ${picks.totalScanned||2000}. Steady picks lead with high ROE & low volatility, Mid balances risk, Aggressive chases upside. Check Top AI Picks in app for full funnel.`}</p>
    </div>
    ${indicesHtml}
    ${moversHtml}
    <p style="font-size:12px;color:#a1a6b5;margin:16px 0 0">Your AI portfolio — <b>Currently showing Top 30</b> (10 Steady / 10 Mid / 10 Aggressive) picked after deep scanning at 7:00 PM IST.</p>
    ${table('🟢 Steady Growth', picks.steady, '#089981')}
    ${table('🟡 Mid Growth', picks.mid, '#f59e0b')}
    ${table('🟠 Aggressive Growth', picks.aggressive, '#F23645')}
    <p style="font-size:11px;color:#5d606b;margin-top:16px">Open your analyzer: http://localhost:5000 • Unsubscribe: POST /api/newsletter/unsubscribe {email}</p>
    <p style="font-size:11px;color:#5d606b">Sources: Yahoo Finance • Screener.in • NSE India • Broker consensus • Not SEBI registered</p>
  </div>`
}

export async function sendDailyPortfolio({ immediate=false }={}){
  console.log(`📧 Newsletter — starting ${immediate?'test':'deep'} scan for ${immediate?'test send':'7 PM send'}...`)
  let picks = await aiPicksService.getAIPicks().catch(async ()=>{
    await new Promise(r=>setTimeout(r, 5000))
    return aiPicksService.getAIPicks()
  })
  // Ensure picks are ready — poll until we have 10+10+10 (small scan can take 3-5 min when Yahoo 429)
  if(!picks.steady?.length){
    console.log('📧 Picks not ready (0 stocks) — waiting for small scan to complete...')
    for(let i=0;i<40;i++){
      await new Promise(r=>setTimeout(r, 3000))
      const fresh = await aiPicksService.getAIPicks().catch(()=>null)
      if(fresh?.steady?.length){
        picks = fresh
        console.log(`📧 Picks ready: ${fresh.steady.length}+${fresh.mid.length}+${fresh.aggressive.length} (${fresh.scanned} scanned)`)
        break
      }
      if(i===39) console.log('📧 Still not ready after 120s — will send whatever is ready (may be 0 if throttled)')
    }
  }
  // If still small (not full), for daily 7 PM wait for full; for immediate test, send current
  let finalPicks = picks
  if(!picks.fullMarket && !immediate){
    console.log('📧 Waiting for full 2,000 scan to complete before sending...')
    for(let i=0;i<24;i++){
      await new Promise(r=>setTimeout(r, 30000))
      const fresh = await aiPicksService.getAIPicks().catch(()=>null)
      if(fresh?.fullMarket){ finalPicks = fresh; break }
    }
  } else if(immediate){
    console.log(`📧 Test send — using current picks (${picks.scanned} scanned, fullMarket=${!!picks.fullMarket})`)
  }
  // Fetch indices + movers for email
  let indices = []
  let movers = {gainers:[], losers:[]}
  let marketSummary = ''
  try{
    indices = await realtime.getIndices().catch(()=>[])
    // Build movers from NIFTY 50 for email
    const NIFTY50 = ["RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SBIN","BHARTIARTL","ITC","LT","KOTAKBANK","LTIM","AXISBANK","ASIANPAINT","MARUTI","TITAN","SUNPHARMA","BAJFINANCE","HCLTECH","WIPRO","ULTRACEMCO","NESTLEIND","POWERGRID","NTPC","ONGC","TATAMOTORS","TATASTEEL","HINDALCO","JSWSTEEL","ADANIENT","ADANIPORTS","COALINDIA","BPCL","BRITANNIA","EICHERMOT","GRASIM","HEROMOTOCO","HINDUNILVR","CIPLA","DIVISLAB","DRREDDY","APOLLOHOSP","BAJAJ-AUTO","BAJAJFINSV","INDUSINDBK","M&M","SHREECEM","TECHM","UPL","SBILIFE","TATACONSUM"]
    const quotes = await realtime.getQuotes(NIFTY50).catch(()=>[])
    const sorted = quotes.filter(q=>!q.error).sort((a,b)=>(b.regularMarketChangePercent||0)-(a.regularMarketChangePercent||0))
    movers = { gainers: sorted.slice(0,5), losers: sorted.slice(-5).reverse(), all: sorted }
    const nifty = indices.find(i=>i.name?.includes('NIFTY 50'))
    const sensex = indices.find(i=>i.name?.includes('SENSEX'))
    const adv = sorted.filter(q=>(q.regularMarketChangePercent||0)>0).length
    const dec = sorted.filter(q=>(q.regularMarketChangePercent||0)<0).length
    marketSummary = `${nifty ? `NIFTY 50 ${nifty.price?.toFixed(2)} (${nifty.changePercent?.toFixed(2)}%)` : ''} ${sensex ? `• SENSEX ${sensex.price?.toFixed(2)} (${sensex.changePercent?.toFixed(2)}%)` : ''} • Breadth: ${adv} gainers vs ${dec} losers in NIFTY 50. AI scanned ${finalPicks?.scanned||picks.scanned} stocks — Steady (low vol, high ROE), Mid (balanced), Aggressive (high upside). Top movers inside.`
  }catch(e){ console.log('📧 movers/indices fetch failed', e.message) }
  const html = portfolioHtml(finalPicks || picks, indices, movers, marketSummary)
  const htmlCompact = portfolioHtmlCompact(finalPicks || picks, indices, movers, marketSummary)
  const emails = getEmails()
  console.log(`📧 Sending daily portfolio to ${emails.length} subscribers...`)
  if(!emails.length){
    console.log('📧 No subscribers — skipping send')
    return { sent: 0 }
  }
  const subject = `Your AI Portfolio — Top 30 Picks ${new Date().toLocaleDateString('en-IN')} • 2,000 scanned`
  let sent = 0
  for(const to of emails){
    try{
      await sendEmail({ to, subject, html, htmlCompact })
      sent++
    }catch(e){ console.error('📧 send failed to', to, e.message) }
  }
  console.log(`📧 Daily portfolio sent to ${sent}/${emails.length}`)
  return { sent, total: emails.length }
}

export function scheduleDailyAt7PM(){
  // Calculate ms until next 19:00 IST (Asia/Kolkata)
  function msUntilNext7PM(){
    const now = new Date()
    const ist = new Date(now.toLocaleString('en-US', {timeZone:'Asia/Kolkata'}))
    const next = new Date(ist)
    next.setHours(19,0,0,0)
    if(next <= ist) next.setDate(next.getDate()+1)
    const diff = next.getTime() - ist.getTime()
    return diff
  }
  const run = async ()=>{
    try{ await sendDailyPortfolio() }catch(e){ console.error('📧 daily job error', e.message) }
    scheduleDailyAt7PM.scheduler = setTimeout(run, msUntilNext7PM())
  }
  const ms = msUntilNext7PM()
  console.log(`📧 Newsletter daily job scheduled — next run in ${(ms/1000/60).toFixed(1)} min (7:00 PM IST)`)
  if(scheduleDailyAt7PM.scheduler) clearTimeout(scheduleDailyAt7PM.scheduler)
  scheduleDailyAt7PM.scheduler = setTimeout(run, ms)

  // Post-market deep scan at 15:35 IST (30 min after close 15:30) — pre-warms full 2,000 with proper reasoning so 19:00 email is instant and not 0 stocks
  try{
    cron.schedule('35 15 * * 1-5', async () => {
      console.log('📧 Post-market deep scan 15:35 IST — scanning 2,000 with proper reasoning (Tech+Fund+Mom+News+Target)...')
      try{ await aiPicksService.startFullScan() }catch(e){ console.error('📧 post-market scan error', e.message)}
    }, { timezone: 'Asia/Kolkata' })
    console.log('📧 Post-market scan scheduled daily at 15:35 IST (30 min after close)')
  }catch(e){ console.log('📧 cron schedule failed', e.message) }
}

export async function sendPortfolioTo(email){
  const clean = String(email||'').trim().toLowerCase()
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Invalid email')
  console.log(`📧 Send-portfolio on demand to ${clean}...`)
  // Use cached picks if available — don't wait long
  let picks = await aiPicksService.getAIPicks().catch(()=>null)
  if(!picks?.steady?.length){
    console.log('📧 Picks not ready — waiting up to 30s...')
    for(let i=0;i<10;i++){
      await new Promise(r=>setTimeout(r, 3000))
      picks = await aiPicksService.getAIPicks().catch(()=>null)
      if(picks?.steady?.length) break
    }
  }
  console.log(`📧 Picks: ${picks?.steady?.length||0}+${picks?.mid?.length||0}+${picks?.aggressive?.length||0} (${picks?.scanned||0} scanned)`)
  let indices=[]
  let movers={gainers:[], losers:[]}
  let marketSummary=''
  try{
    indices = await realtime.getIndices().catch(()=>[])
    const NIFTY50 = ["RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SBIN","BHARTIARTL","ITC","LT","KOTAKBANK","LTIM","AXISBANK","ASIANPAINT","MARUTI","TITAN","SUNPHARMA","BAJFINANCE","HCLTECH","WIPRO","ULTRACEMCO","NESTLEIND","POWERGRID","NTPC","ONGC","TATAMOTORS","TATASTEEL","HINDALCO","JSWSTEEL","ADANIENT","ADANIPORTS","COALINDIA","BPCL","BRITANNIA","EICHERMOT","GRASIM","HEROMOTOCO","HINDUNILVR","CIPLA","DIVISLAB","DRREDDY","APOLLOHOSP","BAJAJ-AUTO","BAJAJFINSV","INDUSINDBK","M&M","SHREECEM","TECHM","UPL","SBILIFE","TATACONSUM"]
    const quotes = await realtime.getQuotes(NIFTY50).catch(()=>[])
    const sorted = quotes.filter(q=>!q.error).sort((a,b)=>(b.regularMarketChangePercent||0)-(a.regularMarketChangePercent||0))
    movers = { gainers: sorted.slice(0,5), losers: sorted.slice(-5).reverse() }
    const nifty = indices.find(i=>i.name?.includes('NIFTY 50'))
    const sensex = indices.find(i=>i.name?.includes('SENSEX'))
    const adv = sorted.filter(q=>(q.regularMarketChangePercent||0)>0).length
    const dec = sorted.filter(q=>(q.regularMarketChangePercent||0)<0).length
    marketSummary = `${nifty ? `NIFTY 50 ${nifty.price?.toFixed(2)} (${nifty.changePercent?.toFixed(2)}%)` : ''} ${sensex ? `• SENSEX ${sensex.price?.toFixed(2)} (${sensex.changePercent?.toFixed(2)}%)` : ''} • Breadth: ${adv} gainers vs ${dec} losers. AI scanned ${picks?.scanned||0} stocks.`
  }catch(e){ console.log('📧 movers/indices fail', e.message) }
  const html = portfolioHtml(picks || {steady:[],mid:[],aggressive:[],scanned:0}, indices, movers, marketSummary)
  const htmlCompact = portfolioHtmlCompact(picks || {steady:[],mid:[],aggressive:[],scanned:0}, indices, movers, marketSummary)
  const result = await sendEmail({
    to: clean,
    subject: `Your AI Portfolio — Top 30 Picks ${new Date().toLocaleDateString('en-IN')} • 2,000 scanned`,
    html,
    htmlCompact
  })
  if(result.mock) return { ok:true, mock:true, to: clean }
  console.log(`📧 Portfolio sent to ${clean} via ${result.method}`)
  return { ok:true, to: clean, method: result.method }
}

export { sendEmail }
export default { addEmail, removeEmail, getEmails, getCount, sendDailyPortfolio, scheduleDailyAt7PM, sendPortfolioTo, sendEmail }
