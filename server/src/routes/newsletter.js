import express from 'express'
import { addEmail, removeEmail, getCount, sendDailyPortfolio, sendPortfolioTo } from '../services/newsletterService.js'

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
router.post('/send-portfolio', async (req,res)=>{
  try{
    const email = req.body?.email || req.query.email
    if(!email) return res.status(400).json({error:'email required'})
    const r = await sendPortfolioTo(email)
    res.json(r)
  }catch(e){ res.status(400).json({error:e.message}) }
})

export default router
