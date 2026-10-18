import { useEffect, useState } from 'react'
import axios from 'axios'

function PickCard({ s, onSelect }){
  const [showInfo, setShowInfo] = useState(false)
  return (
    <div className={`glass-premium hover:border-gray-600 rounded-2xl p-4 text-left w-full relative group shadow-lg ${showInfo ? 'z-50' : 'z-0'}`}>
      {/* Small oval info in top right corner */}
      <div className="absolute top-3 right-3 z-30">
        <button
          onMouseEnter={()=>setShowInfo(true)}
          onMouseLeave={()=>setShowInfo(false)}
          onClick={(e)=>{ e.stopPropagation(); setShowInfo(!showInfo) }}
          className="w-7 h-7 rounded-full bg-gray-900 border border-blue-500/40 text-blue-400 text-xs font-bold flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 transition shadow-md"
          title="Why picked?"
        >ⓘ</button>
        {showInfo && (
          <div className="absolute top-9 right-0 z-50 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4 text-left backdrop-blur-xl" style={{boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)'}}>
            <p className="ai-premium text-xs font-bold text-blue-400 mb-1 tracking-tight">Why {s.symbol} — {s.score}/100 {s.verdict}</p>
            <p className="ai-body text-xs text-gray-200 leading-relaxed mb-2">{s.summary || 'Strong fundamentals & technical alignment.'}</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <p className="text-xs font-bold text-green-400">✅ Pros</p>
                <ul className="ai-body text-xs text-gray-200 list-disc ml-4 mt-1 space-y-1">
                  {(s.pros || []).slice(0,3).map((p,i)=><li key={i}>{p}</li>)}
                  {!s.pros?.length && <li>High score, balanced risk</li>}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold text-red-400">⚠️ Cons</p>
                <ul className="ai-body text-xs text-gray-200 list-disc ml-4 mt-1 space-y-1">
                  {(s.cons || []).slice(0,2).map((c,i)=><li key={i}>{c}</li>)}
                  {!s.cons?.length && <li>Watch volatility</li>}
                </ul>
              </div>
            </div>
            <div className="bg-gray-800/60 rounded-xl p-2.5 text-xs border border-gray-700/50">
              <p className="ai-body text-gray-300">Forecast: 12M ₹{s.target?.toFixed(0)} ({s.upside>0?'+':''}{s.upside?.toFixed(1)}%) • RSI {s.rsi?.toFixed(1)} • P/E {s.pe}</p>
              <p className="text-gray-600 mt-1 font-mono">Sources: Yahoo, Screener.in, News • Not SEBI advice</p>
            </div>
          </div>
        )}
      </div>

      <button onClick={()=>onSelect(s.symbol)} className="w-full text-left">
        <div className="flex justify-between items-start mb-2 pr-8">
          <div>
            <p className="ai-premium font-bold tracking-tight text-white">{s.symbol}</p>
            <p className="ai-body text-xs text-gray-400 font-medium">{s.verdict} • RSI {s.rsi?.toFixed(0)}</p>
          </div>
          <span className="ai-score text-sm font-bold px-2.5 py-1 rounded-full bg-gray-900 border border-blue-500/30 text-blue-400 shadow-md">{s.score}</span>
        </div>
        <p className="ai-premium text-sm font-semibold">₹{s.price?.toFixed(0)} → <span className="font-bold text-green-400">₹{s.target?.toFixed(0)}</span> <span className="text-xs font-bold text-green-400">+{s.upside?.toFixed(1)}%</span></p>
        <p className="ai-body text-xs text-gray-400 mt-1 font-medium">P/E {s.pe || '-'} • ROE {s.roe || '-'}%</p>
        <p className="ai-premium text-xs text-blue-400 mt-2 font-semibold tracking-wide">Click to analyze →</p>
      </button>
    </div>
  )
}

export default function AIPicksPage({ onSelect, onBack }){
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(null)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(()=>{
    axios.get('/api/stocks/ai-picks').then(r=>setData(r.data)).catch(()=>{}).finally(()=>setLoading(false))
    const id = setInterval(()=>{
      axios.get('/api/stocks/ai-picks/progress').then(r=>setProgress(r.data)).catch(()=>{})
    }, 3000)
    return ()=>clearInterval(id)
  },[])
  useEffect(()=>{
    // If full market not yet done, poll picks again every 15s to get updated full scan
    if(data && !data.fullMarket && progress?.percent < 100){
      const t = setTimeout(()=>{
        axios.get('/api/stocks/ai-picks').then(r=>{
          if(r.data.fullMarket || r.data.scanned > data.scanned) setData(r.data)
        }).catch(()=>{})
      }, 15000)
      return ()=>clearTimeout(t)
    }
  },[data, progress])
  if(loading) return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="ai-premium text-xl font-bold tracking-tight">🤖 Top AI Picks</h1>
          <button onClick={onBack} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm">← Back</button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-gray-400">⏳ Starting AI scan in background...</p>
        <p className="text-xs text-gray-600 mt-2">Website stays usable — picks load in background. No need to wait here.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 rounded text-sm">Back to Analyzer (use site while scanning)</button>
      </div>
    </div>
  )
  if(!data) return <div className="p-8 text-center text-gray-500">Failed to load picks</div>
  const isScanning = !data.steady?.length || (data.progress && data.progress.percent < 100 && data.progress.status.includes('scanning'))
  if(isScanning && (!data.steady || data.steady.length===0)){
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="ai-premium text-xl font-bold tracking-tight">🤖 Top AI Picks</h1>
            <button onClick={onBack} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm">← Back</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-8">
          <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6 text-center">
            <p className="text-blue-400 font-semibold">⏳ AI scanning in background — {progress?.scanned || data.progress?.scanned || 0}/{progress?.total || 55} ({progress?.percent || 0}%)</p>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-3"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{width: `${progress?.percent || 5}%`}} /></div>
            <p className="text-sm text-gray-400 mt-3">Website is fully usable — this scans in background as you opened the site. Picks will appear here automatically.</p>
            <button onClick={onBack} className="mt-4 px-6 py-2 bg-blue-600 rounded-xl text-sm font-bold">← Use Analyzer while scanning</button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="ai-premium text-xl font-bold tracking-tight">🤖 Top AI Picks <span className="ai-body text-sm font-normal text-gray-500">• 30 stocks • {data.scanned} scanned</span></h1>
          <button onClick={onBack} className="ai-premium px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 text-sm font-semibold">← Back to Analyzer</button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {progress && progress.isScanning && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-3">
            <p className="text-sm font-semibold text-blue-400">⏳ Scanning whole market: {progress.scanned}/{progress.total} ({progress.percent}%) — found {progress.found} valid • {progress.status}</p>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-2"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{width: `${progress.percent}%`}} /></div>
            <p className="text-xs text-gray-500 mt-1">Full 2,000 scan runs in background — you see Top 55 picks now, auto-updates to 2,000 when done (5-10 min). No refresh needed.</p>
          </div>
        )}
        {!progress?.isScanning && data.fullMarket && <div className="bg-green-900/20 border border-green-800 rounded-xl p-2 text-sm text-green-400">✅ Full market scan complete — showing Top 30 from 2,000 NSE stocks</div>}
        {!progress?.isScanning && !data.fullMarket && <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-2 text-sm text-yellow-400">⚡ Showing Top 55 picks — full 2,000 scan starting in background...</div>}
        <p className="text-sm text-gray-400">{data.disclaimer} • Updated {new Date(data.updatedAt).toLocaleString('en-IN')} • Click ⓘ for why • Scanned {data.scanned}/{data.totalScanned || data.scanned}</p>
        {/* Send portfolio on email — same format as daily 7 PM */}
        <div className="bg-gray-900 border border-blue-500/20 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div>
            <p className="ai-premium text-sm font-bold text-white">📧 Send me portfolio on my email</p>
            <p className="ai-body text-xs text-gray-400">Same format as daily 7 PM — Top 30 + Indices + Top Movers + per-stock Why/Pros/Cons</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@gmail.com" className="flex-1 md:w-64 bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500" />
            <button disabled={sending || !email} onClick={async()=>{
              setSending(true); setMsg('')
              try{
                const r = await axios.post('/api/newsletter/send-portfolio', { email }, { timeout: 15000 })
                setMsg(r.data.mock ? `⚠️ SMTP not configured on server — mock sent to ${r.data.to}. Add SMTP env vars on Render.` : `📧 Sending to ${r.data.to} — email arrives in ~1 minute ✓ Check inbox/spam`)
              }catch(e){ setMsg(e.response?.data?.error || 'Failed to send') }
              setSending(false)
            }} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white whitespace-nowrap">
              {sending ? 'Sending...' : 'Send portfolio'}
            </button>
          </div>
        </div>
        {msg && <p className="text-sm text-blue-400 -mt-2">{msg}</p>}
        
        <section>
          <h2 className="ai-premium font-bold text-green-400 mb-3 tracking-tight">🟢 Steady Growth — 10 Stocks <span className="ai-body text-xs font-normal text-gray-500">• Low risk • 12M hold • Large cap stable</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {data.steady.map(s=> <PickCard key={s.symbol} s={s} onSelect={(sym)=>{ onSelect(sym); onBack(); }} />)}
          </div>
        </section>
        <section>
          <h2 className="ai-premium font-bold text-yellow-400 mb-3 tracking-tight">🟡 Mid Growth — 10 Stocks <span className="ai-body text-xs font-normal text-gray-500">• Balanced risk/reward</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {data.mid.map(s=> <PickCard key={s.symbol} s={s} onSelect={(sym)=>{ onSelect(sym); onBack(); }} />)}
          </div>
        </section>
        <section>
          <h2 className="ai-premium font-bold text-orange-400 mb-3 tracking-tight">🔴 Aggressive Growth — 10 Stocks <span className="ai-body text-xs font-normal text-gray-500">• High risk / high reward</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {data.aggressive.map(s=> <PickCard key={s.symbol} s={s} onSelect={(sym)=>{ onSelect(sym); onBack(); }} />)}
          </div>
        </section>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="font-semibold mb-2">What to add here?</h3>
          <p className="text-sm text-gray-400">Tell me what you want on this full page — e.g., detailed table with P/E, ROE, 1Y return, chart preview, filters, export, etc. I’ll build it.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={onBack} className="px-4 py-2 bg-blue-600 rounded text-sm">Back to Analyzer</button>
            <span className="text-xs text-gray-600 self-center">Full page — as you requested</span>
          </div>
        </div>
        <footer className="text-center py-6 border-t border-gray-800 mt-6">
          <p className="ai-premium text-sm font-bold tracking-tight">Made by <span className="text-blue-400">Saurabh</span> <span className="text-gray-600 font-normal">• Top AI Picks • 30 stocks</span></p>
          <p className="text-xs text-gray-600 mt-1">Not SEBI registered • For education only</p>
        </footer>
      </div>
    </div>
  )
}
