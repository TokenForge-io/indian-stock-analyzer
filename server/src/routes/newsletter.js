import express from 'express'
import { addEmail, removeEmail, getCount, sendDailyPortfolio, sendPortfolioTo } from '../services/newsletterService.js'
import nodemailer from 'nodemailer'

const router = express.Router()

router.post('/subscribe', (req,res)=>{
  try{
    const email = req.body?.email || req.query.email
    if(!email) return res.status(400).json({error:'email required'})
    const r = addEmail(email)
    res.json({ ok:true, email: String(email).toLowerCase(), already: r.already, count: r.count })
  }catch(e){ res.status(400).json({error:e.message}) }
})

router.post('/unsubscribe', (req,res)=>{
  try{
    const email = req.body?.email || req.query.email
    if(!email) return res.status(400).json({error:'email required'})
    const r = removeEmail(email)
    res.json({ ok:true, removed: r.removed, count: r.count })
  }catch(e){ res.status(400).json({error:e.message}) }
})

router.get('/count', (req,res)=> res.json({ count: getCount() }))

// Admin trigger — POST /api/newsletter/send-now (for testing) — immediate send current picks
router.post('/send-now', async (req,res)=>{
  try{
    const r = await sendDailyPortfolio({ immediate: true })
    res.json({ ok:true, ...r })
  }catch(e){ res.status(500).json({error:e.message}) }
})

// On-demand single send — POST /api/newsletter/send-portfolio {email}
// Fire-and-forget: respond immediately, send email in background (takes 30-60s on Render)
// Add ?sync=1 to wait for the result (diagnostic)
router.post('/send-portfolio', async (req,res)=>{
  try{
    const email = req.body?.email || req.query.email
    if(!email) return res.status(400).json({error:'email required'})
    const clean = String(email).trim().toLowerCase()
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return res.status(400).json({error:'Invalid email'})
    if(req.query.sync === '1'){
      const r = await sendPortfolioTo(clean)
      return res.json({ ok:true, ...r, sync:true })
    }
    res.json({ ok:true, to: clean, background:true })
    sendPortfolioTo(clean).then(r=>console.log('📧 background send result:', JSON.stringify(r))).catch(e=>console.error('📧 background send FAILED:', e.message, e.code || ''))
  }catch(e){ res.status(400).json({error:e.message}) }
})

// Diagnostic: test SMTP connectivity on both ports
router.get('/test-smtp', async (req,res)=>{
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

// Diagnostic: send a quick test email (explicit recipient required — no default)
router.post('/test-email', async (req,res)=>{
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
