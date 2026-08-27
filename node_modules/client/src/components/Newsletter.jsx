import { useState } from 'react'
import axios from 'axios'

export default function Newsletter({ compact=false }){
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null) // {type:'success'|'error', msg}
  const [loading, setLoading] = useState(false)

  const subscribe = async ()=>{
    const clean = email.trim().toLowerCase()
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)){
      setStatus({type:'error', msg:'Enter a valid email'})
      return
    }
    setLoading(true); setStatus(null)
    try{
      const r = await axios.post('/api/newsletter/subscribe', { email: clean })
      if(r.data.already) setStatus({type:'success', msg:'Already subscribed ✓ — you’ll get daily portfolio at 7:00 PM IST'})
      else setStatus({type:'success', msg:'Subscribed ✓ — daily AI portfolio at 7:00 PM IST after deep 2,000 scan'})
      setEmail('')
    }catch(e){
      setStatus({type:'error', msg: e.response?.data?.error || 'Failed — try again'})
    }
    setLoading(false)
  }

  if(compact){
    return (
      <div className="flex gap-2 items-center">
        <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&subscribe()} placeholder="you@email.com" className="flex-1 px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-[8px] text-sm text-white placeholder-[#5d606b] focus:outline-none focus:border-[#2962FF]" />
        <button onClick={subscribe} disabled={loading} className="px-4 py-2 bg-[#2962FF] hover:bg-[#1e4bd8] disabled:opacity-50 text-white rounded-[8px] font-bold text-sm whitespace-nowrap">{loading?'...':'Subscribe'}</button>
      </div>
    )
  }

  return (
    <div className="bg-[#0f141a] border border-[#2a2e39] rounded-[10px] p-4 md:p-6">
      <div className="flex items-center gap-2">
        <span className="w-1 h-6 bg-[#2962FF] rounded-full" />
        <h3 className="font-sans text-[16px] font-bold tracking-tight text-white">Subscribe — Daily AI Portfolio at 7:00 PM</h3>
        <span className="font-mono text-[10px] tracking-widest uppercase text-[#787b86] border border-[#2a2e39] rounded-full px-2 py-1 bg-[#1e222d]">Newsletter • No spam</span>
      </div>
      <p className="font-mono text-[11px] leading-relaxed text-[#787b86] mt-2">Add your email — our AI will deep-scan <span className="text-[#d1d4dc] font-bold">2,000 NSE stocks</span> and send your created portfolio (Top 30: 10 Steady / 10 Mid / 10 Aggressive) to your inbox daily at <span className="text-[#2962FF] font-bold">7:00 PM IST</span>. Uses official NSE/BSE filings + broker targets.</p>
      <div className="flex flex-col md:flex-row gap-2 mt-3">
        <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&subscribe()} placeholder="your.email@example.com" className="flex-1 px-3 py-2.5 bg-[#131722] border border-[#2a2e39] rounded-[8px] text-sm text-white placeholder-[#5d606b] focus:outline-none focus:border-[#2962FF] font-mono" />
        <button onClick={subscribe} disabled={loading} className="px-6 py-2.5 bg-[#2962FF] hover:bg-[#1e4bd8] disabled:opacity-50 text-white rounded-[8px] font-bold text-sm whitespace-nowrap">Subscribe — Free</button>
      </div>
      {status && <p className={`font-mono text-xs mt-2 ${status.type==='success'?'text-[#089981]':'text-[#F23645]'}`}>{status.msg}</p>}
      <p className="font-mono text-[10px] text-[#5d606b] mt-2">We never share your email • Unsubscribe anytime • Preview sent immediately on subscribe</p>
    </div>
  )
}
