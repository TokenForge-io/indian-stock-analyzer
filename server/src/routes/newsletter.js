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
router.post('/send-portfolio', async (req,res)=>{
  try{
    const email = req.body?.email || req.query.email
    if(!email) return res.status(400).json({error:'email required'})
    const clean = String(email).trim().toLowerCase()
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return res.status(400).json({error:'Invalid email'})
    res.json({ ok:true, to: clean, background:true })
    sendPortfolioTo(clean).then(r=>console.log('📧 background send result:', JSON.stringify(r))).catch(e=>console.error('📧 background send FAILED:', e.message, e.code || ''))
  }catch(e){ res.status(400).json({error:e.message}) }
})

// Diagnostic: test SMTP connectivity on both ports
router.get('/test-smtp', async (req,res)=>{
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if(!host || !user || !pass){
    return res.json({ ok:false, error:'SMTP env vars not set', has:{host:!!host, user:!!user, pass:!!pass} })
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
  res.json({ ok:Object.values(results).some(v=>v==='WORKS'), host, user, results })
})

// Diagnostic: send a quick test email (no portfolio, just "test" text)
router.post('/test-email', async (req,res)=>{
  const to = req.body?.email || 'sartist100@gmail.com'
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if(!host || !user || !pass) return res.json({ ok:false, error:'SMTP env vars not set' })
  try{
    const t = nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT||587), secure: process.env.SMTP_SECURE==='true', auth:{user, pass}, connectionTimeout: 10000 })
    await t.verify()
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || user,
      to,
      subject: 'SMTP Test — Indian Stock Analyzer',
      html: '<h2>SMTP works!</h2><p>If you received this email, email sending is working on the server.</p>'
    })
    res.json({ ok:true, to, messageId: info.messageId })
  }catch(e){
    res.json({ ok:false, error:e.message, code:e.code })
  }
})

export default router
