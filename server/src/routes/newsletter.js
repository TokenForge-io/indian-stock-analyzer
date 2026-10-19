import express from 'express'
import { addEmail, removeEmail, getCount, getMaxSubscribers, sendDailyPortfolio, sendPortfolioTo } from '../services/newsletterService.js'
import emailBudget from '../services/emailBudget.js'
import { subscribeLimits, sendPortfolioLimits, unsubscribeLimits } from '../middleware/rateLimit.js'
import nodemailer from 'nodemailer'

const router = express.Router()

// Public email-request dedup: same address at most once per 24h (stops repeat spam to a victim)
const recentSend = new Map()
const DEDUP_MS = 24 * 60 * 60 * 1000
function recentlySent(email){
  // prune stale entries so the map can't grow unbounded
  const now = Date.now()
  for(const [k, t] of recentSend){ if(now - t > DEDUP_MS) recentSend.delete(k) }
  const t = recentSend.get(email)
  return !!t && (now - t < DEDUP_MS)
}
function markSent(email){ recentSend.set(email, Date.now()) }

// Admin-only guard — Bearer header or ?key=. 403 when ADMIN_SECRET is unset so it is never open.
function requireAdmin(req, res, next){
  const secret = process.env.ADMIN_SECRET
  if(!secret) return res.status(403).json({ error: 'ADMIN_SECRET not configured' })
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || req.query.key
  if(token !== secret) return res.status(403).json({ error: 'Invalid admin key' })
  next()
}

router.post('/subscribe', subscribeLimits, (req,res)=>{
  try{
    const email = req.body?.email || req.query.email
    if(!email) return res.status(400).json({error:'email required'})
    const r = addEmail(email)
    res.json({ ok:true, email: String(email).toLowerCase(), already: r.already, count: r.count, max: r.max })
  }catch(e){
    if(e.code === 'FULL') return res.status(403).json({ error: e.message, full: true, max: getMaxSubscribers() })
    res.status(400).json({error:e.message})
  }
})

router.post('/unsubscribe', unsubscribeLimits, (req,res)=>{
  try{
    const email = req.body?.email || req.query.email
    if(!email) return res.status(400).json({error:'email required'})
    const r = removeEmail(email)
    res.json({ ok:true, removed: r.removed, count: r.count })
  }catch(e){ res.status(400).json({error:e.message}) }
})

router.get('/count', (req,res)=> res.json({ count: getCount(), max: getMaxSubscribers() }))

// Admin trigger — POST /api/newsletter/send-now — immediate send of current picks (ADMIN_SECRET)
router.post('/send-now', requireAdmin, async (req,res)=>{
  try{
    const r = await sendDailyPortfolio({ immediate: true })
    res.json({ ok:true, ...r })
  }catch(e){ res.status(500).json({error:e.message}) }
})

// On-demand single send — POST /api/newsletter/send-portfolio {email}
// Rate-limited, deduped per address, and counted against the monthly email budget.
router.post('/send-portfolio', sendPortfolioLimits, async (req,res)=>{
  try{
    const email = req.body?.email || req.query.email
    if(!email) return res.status(400).json({error:'email required'})
    const clean = String(email).trim().toLowerCase()
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return res.status(400).json({error:'Invalid email'})
    if(recentlySent(clean)) return res.status(429).json({ error: `Already sent to ${clean} in the last 24 hours.` })
    if(!emailBudget.canSend()) return res.status(429).json({ error: 'Email limit reached for this month. Please try again next month.' })

    markSent(clean)
    if(req.query.sync === '1'){
      const r = await sendPortfolioTo(clean)
      return res.json({ ok:true, ...r, sync:true })
    }
    res.json({ ok:true, to: clean, background:true })
    sendPortfolioTo(clean).then(r=>console.log('📧 background send result:', JSON.stringify(r))).catch(e=>console.error('📧 background send FAILED:', e.message, e.code || ''))
  }catch(e){ res.status(400).json({error:e.message}) }
})

// Diagnostic: test SMTP connectivity on both ports (ADMIN_SECRET)
router.get('/test-smtp', requireAdmin, async (req,res)=>{
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const emailjs = {
    configured: !!(process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY)
  }
  const resend = { configured: !!process.env.RESEND_API_KEY }
  if(!host || !user || !pass){
    return res.json({ ok:false, error:'SMTP env vars not set', has:{host:!!host, user:!!user, pass:!!pass}, emailjs, resend })
  }
  const results = {}
  for(const port of [465, 587]){
    try{
      const t = nodemailer.createTransport({ host, port, secure: port===465, auth:{user, pass}, connectionTimeout: 10000, greetingTimeout: 10000 })
      await t.verify()
      results[port] = 'WORKS'
    }catch(e){
      results[port] = `FAIL: ${e.message} (${e.code||''})`
    }
  }
  res.json({ ok:Object.values(results).some(v=>v==='WORKS'), results, emailjs, resend })
})

// Diagnostic: send a quick test email (ADMIN_SECRET; explicit recipient required)
router.post('/test-email', requireAdmin, async (req,res)=>{
  const to = req.body?.email
  if(!to) return res.status(400).json({ error:'email required' })
  const hasEmailJS = !!(process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY)
  const hasResend = !!process.env.RESEND_API_KEY
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  if(!hasEmailJS && !hasResend && !hasSmtp) return res.json({ ok:false, error:'No email configured (need EMAILJS_*, RESEND_API_KEY, or SMTP vars)' })
  try{
    const { sendEmail } = await import('../services/newsletterService.js')
    const result = await sendEmail({
      to,
      subject: 'SMTP Test — Indian Stock Analyzer',
      html: '<h2>Email works!</h2><p>If you received this email, email sending is working on the server.</p>'
    })
    res.json({ ok:true, to, method: result.method })
  }catch(e){
    res.json({ ok:false, error:e.message, code:e.code, hasEmailJS, hasResend, hasSmtp })
  }
})

export default router
