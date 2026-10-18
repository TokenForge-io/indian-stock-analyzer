import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import StockChart from './components/StockChart.jsx'
import Watchlist from './components/Watchlist.jsx'
import IndicesBar from './components/IndicesBar.jsx'
import MoversTopBar from './components/MoversTopBar.jsx'
import Screener from './components/Screener.jsx'
import StockTabs from './components/StockTabs.jsx'
import CompareSection from './components/CompareSection.jsx'
import SearchAutocomplete from './components/SearchAutocomplete.jsx'
import AIPicksPage from './components/AIPicksPage.jsx'
import HomePage from './components/HomePage.jsx'
import Newsletter from './components/Newsletter.jsx'
import { INDIAN_STOCKS } from './data/indianStocks.js'
const socket = import.meta.env.VITE_API_URL ? io(import.meta.env.VITE_API_URL) : io()

export default function App() {
  const [symbol, setSymbol] = useState('RELIANCE')
  const [input, setInput] = useState('RELIANCE')
  const [analysis, setAnalysis] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [livePrice, setLivePrice] = useState(null)
  const [compareMode, setCompareMode] = useState(false)
  const [showAIPicks, setShowAIPicks] = useState(false)
  const [showHome, setShowHome] = useState(true)
  const [companyInfo, setCompanyInfo] = useState(null)
  const [chartPeriod, setChartPeriod] = useState('3mo')

  const [error, setError] = useState(null)
  const fetchSeq = useRef(0)
  const fetchData = async (sym) => {
    const period = chartPeriod
    const interval = period==='5y' ? '1wk' : '1d'
    const seq = ++fetchSeq.current
    setLoading(true); setError(null); 
    try {
      const [ana, hist] = await Promise.all([
        axios.get(`/api/stocks/analysis/${sym}`),
        axios.get(`/api/stocks/history/${sym}?period=${period}&interval=${interval}`)
      ])
      if (seq !== fetchSeq.current) return // stale response — newer request superseded it
      setAnalysis(ana.data)
      setHistory(hist.data)
      setLivePrice(ana.data.price)
    } catch (e) { 
      if (seq !== fetchSeq.current) return
      console.error(e); 
      const msg = e.response?.data?.error || e.message
      // Don't alert for rate-limit, just show banner (backend now uses mocks, so this rarely happens)
      if (msg.includes('Too Many Requests')) setError('Yahoo rate-limited - showing cached/mock data. Try again in 30s.')
      else setError(msg)
      
    }
    if (seq === fetchSeq.current) setLoading(false)
  }

  useEffect(() => { fetchData(symbol); axios.get(`/api/stocks/info/${symbol}`).then(r=>setCompanyInfo(r.data)).catch(()=>setCompanyInfo(null)) }, [symbol, chartPeriod])
  // Prefetch AI picks in background as soon as website opens (so 2,000 scan starts early)
  useEffect(()=>{
    axios.get('/api/stocks/ai-picks').catch(()=>{})
    axios.get('/api/stocks/ai-picks/progress').catch(()=>{})
  },[])

  // Subscribe to live updates via socket
  useEffect(() => {
    socket.emit('subscribe', [symbol])
    const handler = (quotes) => {
      const q = quotes.find(x => x.symbol?.includes(symbol))
      if (q?.regularMarketPrice) setLivePrice(q.regularMarketPrice)
    }
    socket.on('quotes', handler)
    return () => { socket.off('quotes', handler); socket.emit('unsubscribe') }
  }, [symbol])

  const handleSearch = (sym) => {
    const raw = (sym || input).trim()
    if(!raw) return
    const lower = raw.toLowerCase()
    // Special: physics wallah -> PWL
    if(lower.includes('physics') && lower.includes('wallah')){ setSymbol('PWL'); return }
    // Try find in local list by symbol or name
    const norm = lower.replace(/\s+/g,'').replace(/-/g,'')
    let found = INDIAN_STOCKS.find(s=> s.symbol.toLowerCase()===norm)
    if(!found){
      const qWords = lower.split(/\s+/)
      found = INDIAN_STOCKS.find(s=> qWords.every(w=> s.name.toLowerCase().includes(w)))
    }
    if(found){ setSymbol(found.symbol); return }
    const s = raw.toUpperCase().replace(/\s+/g,'').replace('.NS','').replace(/[^A-Z0-9\-]/g,'')
    if(s) setSymbol(s)
  }

  if(showHome){
    return <HomePage onEnter={()=>setShowHome(false)} onPicks={()=>{ setShowHome(false); setShowAIPicks(true); }} />
  }
  if(showAIPicks){
    return <AIPicksPage onSelect={(sym)=>{ setSymbol(sym); setShowAIPicks(false); setCompareMode(false); }} onBack={()=>setShowAIPicks(false)} />
  }

  return (
    <div className="min-h-screen text-gray-100 ai-body">
      <header className="sticky top-0 z-20 glass-header p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between">
          <h1 className="ai-premium text-xl font-bold tracking-tight">Indian Stock Analyzer <span className="text-xs font-normal text-gray-400 tracking-normal">NSE/BSE • Real-time via Yahoo</span></h1>
<div className="flex gap-2 items-center">
            <button onClick={()=>setShowHome(true)} className="px-3 py-2 rounded-xl text-sm font-semibold border glass-card hover:border-blue-500/40">🏠 Home</button>
            <button onClick={()=>setCompareMode(!compareMode)} className={`px-3 py-2 rounded-xl text-sm font-semibold border backdrop-blur transition-all ${compareMode ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'glass-card hover:border-blue-500/40'}`}>{compareMode ? '← Single' : '⚖️ Compare'}</button>
            <div className="flex gap-2 items-center">
              <div className="w-40 md:w-56">
                <SearchAutocomplete value={input} onChange={setInput} onSelect={handleSearch} placeholder="Tata Motors..." onEnter={handleSearch} />
              </div>
              <button onClick={()=>handleSearch()} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold shadow-lg">Analyze</button>
            </div>
          </div>
        </div>
      </header>

      <IndicesBar />
      <div className="glass-topbar">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <p className="ai-premium text-sm font-semibold">🤖 Top AI Picks across NSE — Top 10</p>
          <button onClick={()=>setShowAIPicks(true)} className="px-4 py-1.5 tv-gradient hover:opacity-90 rounded-xl text-sm font-bold shadow-lg transition-all hover:shadow-xl">Check Top AI Picks →</button>
        </div>
      </div>
      <MoversTopBar onSelect={setSymbol} />

      {compareMode ? (
        <CompareSection initialSymbol={symbol} />
      ) : (
        <main className="max-w-7xl mx-auto p-4 grid grid-cols-12 gap-4">
        {/* Left: Chart + Analysis */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="glass-card rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <h2 className="ai-premium text-2xl font-bold tracking-tight">{symbol}.NS {livePrice && <span className="text-green-400">₹{livePrice?.toFixed(2)}</span>} {companyInfo && <span className="ml-2 text-xs font-normal align-middle space-x-2"><a href={companyInfo.wikipedia} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline" title="Wikipedia">Wikipedia</a><a href={companyInfo.links?.screener} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline">Screener</a><a href={companyInfo.links?.tradingview} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline">TradingView</a></span>}</h2>
                {companyInfo && <p className="text-xs text-gray-400 mt-1 line-clamp-2" title={companyInfo.about}><span className="font-semibold text-gray-300">{companyInfo.name}</span> — {companyInfo.about}</p>}
                {companyInfo?.links && <p className="text-xs mt-1 flex flex-wrap gap-2"> {companyInfo.website && <a href={companyInfo.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">🌐 {companyInfo.website.replace('https://','').replace('http://','').split('/')[0]}</a>} <a href={companyInfo.links.nse} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">NSE</a> <a href={companyInfo.links.bse} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">BSE</a> <a href={companyInfo.links.moneycontrol} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">MoneyControl</a> <span className="text-gray-600">• {companyInfo.credibleSources?.slice(0,3).join(' • ')}</span></p>}
                {analysis && <p className={`ai-body text-sm font-medium mt-1 ${analysis.change >=0 ? 'text-green-400' : 'text-red-400'}`}>{analysis.change?.toFixed(2)} ({analysis.changePercent?.toFixed(2)}%) • {analysis.indicators?.signal} • RSI {analysis.indicators?.rsi?.toFixed(1)}</p>}
              </div>
              <span className="text-xs glass-card px-2.5 py-1 rounded-full font-mono flex-shrink-0 ml-3">{loading ? 'Loading...' : 'Live ○ 3s • screener.in'}</span>
            </div>

            {error && <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 text-sm p-2 rounded-xl mb-2 backdrop-blur">{error} <button onClick={()=>fetchData(symbol)} className="underline ml-2">Retry</button></div>}
            <div className="flex gap-1 mb-2 flex-wrap items-center">
              {[
                {k:'5d', l:'1W'},
                {k:'1mo', l:'1M'},
                {k:'3mo', l:'3M'},
                {k:'6mo', l:'6M'},
                {k:'1y', l:'1Y'},
                {k:'5y', l:'5Y'},
              ].map(btn=>(
                <button key={btn.k} onClick={()=>setChartPeriod(btn.k)} className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${chartPeriod===btn.k ? 'bg-[#2962FF] border-[#2962FF] text-white' : 'bg-[#1e222d] border-[#2a2e39] text-[#787b86] hover:border-[#2962FF]/30'}`}>{btn.l}</button>
              ))}
              <span className="text-xs text-[#5d606b] self-center ml-2 font-mono hidden md:inline">Candle ↔ Line • Google-like line for beginners</span>
            </div>
            {history.length > 0 ? <StockChart data={history} /> : loading ? <p className="text-gray-500 py-20 text-center">Loading chart...</p> : <p className="text-gray-500 py-20 text-center">Chart unavailable — {error || 'no data'} <button onClick={()=>fetchData(symbol)} className="ml-2 px-3 py-1 bg-gray-800 rounded text-xs">Retry</button></p>}
          </div>

          {analysis?.kpi && (
            <div className="glass-card rounded-2xl p-4">
              <h3 className="ai-premium font-bold mb-3 text-sm tracking-tight">📊 Key Stats <span className="text-xs font-normal text-gray-500">• Live Google-style KPI</span></h3>
              <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
                <Card label="Open" value={fmt(analysis.kpi.open)} />
                <Card label="High" value={fmt(analysis.kpi.high)} />
                <Card label="Low" value={fmt(analysis.kpi.low)} />
                <Card label="Mkt Cap" value={analysis.kpi.mktCap || '-'} />
                <Card label="P/E ratio" value={fmt(analysis.kpi.pe)} />
                <Card label="Volume" value={fmtVol(analysis.kpi.volume)} />
                <Card label="Prev close" value={fmt(analysis.kpi.prevClose)} />
                <Card label="52W high" value={analysis.kpi.week52High || '-'} />
                <Card label="52W low" value={analysis.kpi.week52Low || '-'} />
              </div>
            </div>
          )}

          {analysis?.indicators && (
            <SimpleTechnicalView indicators={analysis.indicators} price={analysis.price} />
          )}
          <StockTabs symbol={symbol} />
        </div>

        {/* Right: Watchlist + Movers + Screener */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Watchlist onSelect={setSymbol} />
          <Screener onSelect={setSymbol} />
        </div>
      </main>
      )}

      <div className="max-w-7xl mx-auto px-4 pb-2">
        <Newsletter />
      </div>
      <footer className="text-center py-6">
        <p className="ai-premium text-sm font-bold tracking-tight">Made by <span className="text-blue-400">Saurabh</span> <span className="text-gray-600 font-normal">• Built with Yahoo Finance • Screener.in • Real-time 3s</span></p>
        <p className="text-xs text-gray-600 mt-1">Not SEBI registered • For education only • Data ~1-5 min delayed • Add Angel One for tick-by-tick</p>
      </footer>
    </div>
  )
}

function fmt(n){
  if(n==null || n==='-' || n==='') return '-';
  if(typeof n==='string' && isNaN(Number(n.replace(/,/g,'')))) return n;
  const num = Number(String(n).replace(/,/g,''));
  if(isNaN(num)) return String(n);
  return num.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function fmtVol(n){
  if(n==null) return '-';
  const num = Number(n);
  if(isNaN(num)) return String(n);
  if(num >= 1e7) return (num/1e7).toFixed(2)+' Cr';
  if(num >= 1e5) return (num/1e5).toFixed(2)+' L';
  if(num >= 1e3) return (num/1e3).toFixed(1)+'K';
  return num.toLocaleString('en-IN');
}
function Card({label, value}) {
  return <div className="glass-card rounded-xl p-3 hover:border-blue-500/20"><p className="text-xs text-gray-500 tracking-wide uppercase">{label}</p><p className="ai-premium font-bold text-sm">{typeof value==='string'?value:JSON.stringify(value)}</p></div>
}

function SimpleTechnicalView({ indicators, price }){
  const simpleMap = (r)=>{
    if(r.includes('RSI deeply oversold')) return { icon:'🟢', simple:'Very low energy — price fell a lot, might bounce up', tip:'RSI <28 means many sold, often a buy chance' }
    if(r.includes('RSI oversold')) return { icon:'🟢', simple:'Low energy — many people sold, could go up', tip:'RSI <35: oversold' }
    if(r.includes('RSI deeply overbought')) return { icon:'🔴', simple:'Very high energy — price ran up fast, may fall', tip:'RSI >72: overbought' }
    if(r.includes('RSI overbought')) return { icon:'🟠', simple:'High energy — price up a lot, be careful', tip:'RSI >65' }
    if(r.includes('RSI neutral-strong')) return { icon:'🟡', simple:'Balanced energy — steady, good for up moves', tip:'RSI 45-60: healthy momentum' }
    if(r.includes('RSI neutral')) return { icon:'⚪', simple:'Balanced — not too high, not too low', tip:'RSI 35-65: neutral' }
    if(r.includes('Strong uptrend')) return { icon:'📈', simple:'Strong uptrend — price above all averages', tip:'Price > SMA20 > SMA50 > SMA200: long uptrend' }
    if(r.includes('Uptrend: price above SMA20 > SMA50')) return { icon:'📈', simple:'Going up — price above short & long average', tip:'SMA = average price of last 20/50 days' }
    if(r.includes('Strong downtrend')) return { icon:'📉', simple:'Strong downtrend — price below all averages', tip:'Price < SMA20 < SMA50 < SMA200' }
    if(r.includes('Downtrend: price below SMA20 < SMA50')) return { icon:'📉', simple:'Going down — price below averages', tip:'Bearish trend' }
    if(r.includes('Consolidation')) return { icon:'↔️', simple:'Moving sideways — waiting for direction', tip:'Price between averages' }
    if(r.includes('Mixed: price below SMA20 but above SMA50')) return { icon:'🔀', simple:'Mixed — short-term weak but long-term ok', tip:'Conflicting signals' }
    if(r.includes('Price near SMA20')) return { icon:'➖', simple:'Price near average — no clear trend', tip:'Close to SMA20' }
    if(r.includes('MACD bullish')) return { icon:'🟢', simple:'Short-term power getting stronger', tip:'MACD > Signal: bullish' }
    if(r.includes('MACD turning bullish')) return { icon:'🟡', simple:'Power is turning up', tip:'MACD crossing up' }
    if(r.includes('MACD bearish')) return { icon:'🔴', simple:'Short-term power a bit weak', tip:'MACD < Signal: bearish' }
    if(r.includes('Above Bollinger upper')) return { icon:'⚠️', simple:'Price very high — might pull back', tip:'Above upper band: overextended' }
    if(r.includes('Below Bollinger lower')) return { icon:'💡', simple:'Price very low — might bounce', tip:'Below lower band: oversold' }
    if(r.includes('Within Bollinger bands')) return { icon:'📦', simple:'Price in normal range', tip:'Inside bands: normal volatility' }
    if(r.includes('Strong momentum')) return { icon:'🚀', simple:r, tip:'Big move today' }
    if(r.includes('Weak momentum')) return { icon:'🐢', simple:r, tip:'Small move today' }
    return { icon:'•', simple: r, tip:'' }
  }

  const verdictSimple = {
    'BUY': { text: '✅ Good time to consider buying', desc: 'Signals show strength — price likely to go up', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    'SELL': { text: '🔴 Better to be careful / consider selling', desc: 'Signals show weakness — price may fall', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    'HOLD': { text: '⏸️ Okay to wait — not strong buy or sell', desc: 'Mixed signals — watch and wait for clearer direction', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' }
  }[indicators.signal] || { text: 'Hold', desc: '', color: 'text-gray-400', bg: '' }

  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className={`rounded-xl p-3 border mb-3 ${verdictSimple.bg}`}>
        <h3 className="ai-premium font-bold tracking-tight flex items-center gap-2">🧠 Technical View: <span className={verdictSimple.color}>{indicators.signal}</span> <span className="text-xs font-normal text-gray-500">• for 0 finance</span></h3>
        <p className={`ai-body text-sm font-semibold mt-1 ${verdictSimple.color}`}>{verdictSimple.text}</p>
        <p className="text-xs text-gray-400 mt-1">{verdictSimple.desc} • Score {indicators.score?.toFixed(1) || ''} • RSI {indicators.rsi?.toFixed(1)}</p>
      </div>

      <div className="space-y-2">
        {indicators.reasons.map((r,i)=>{
          const s = simpleMap(r)
          return (
            <div key={i} className="flex gap-3 p-2.5 glass-card rounded-xl hover:border-blue-500/20">
              <span className="text-lg flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="ai-body text-sm font-medium text-gray-200">{s.simple}</p>
                <p className="text-xs text-gray-500 font-mono truncate" title={r}>{r}</p>
                {s.tip && <p className="text-xs text-gray-600 mt-0.5">💡 {s.tip}</p>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={()=>setShowDetails(!showDetails)} className="text-xs px-3 py-1.5 glass-card rounded-full hover:border-blue-500/30">
          {showDetails ? 'Hide technical details' : 'Show technical details ▼'}
        </button>
        <span className="text-xs text-gray-600 self-center">Simple mode for beginners</span>
      </div>

      {showDetails && (
        <div className="mt-3 p-3 bg-gray-900/50 rounded-xl border border-gray-800 text-xs font-mono space-y-1">
          <p>Price: ₹{indicators.price?.toFixed(2)} • SMA20: ₹{indicators.sma20?.toFixed(2)} • SMA50: ₹{indicators.sma50?.toFixed(2)} • SMA200: ₹{indicators.sma200?.toFixed(2)}</p>
          <p>RSI: {indicators.rsi?.toFixed(2)} • MACD: {indicators.macd?.toFixed(2)} vs Signal {indicators.signalLine?.toFixed(2)} • BB: {indicators.bbLower?.toFixed(2)} - {indicators.bbUpper?.toFixed(2)}</p>
          <p className="text-gray-500">RSI = energy (0-100, &lt;30 oversold, &gt;70 overbought) • SMA = average price • MACD = power trend • Bollinger = normal range</p>
        </div>
      )}

      <p className="text-xs text-gray-600 mt-3">Not financial advice. For education only. Tap any card to learn.</p>
    </div>
  )
}
