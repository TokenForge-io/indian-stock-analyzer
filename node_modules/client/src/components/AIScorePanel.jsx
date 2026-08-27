import { useEffect, useState } from 'react'
import axios from 'axios'

export default function AIScorePanel({ symbol }){
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    if(!symbol) return
    setLoading(true)
    axios.get(`/api/stocks/ai/${symbol}`)
      .then(r=>setData(r.data))
      .catch(()=>setData(null))
      .finally(()=>setLoading(false))
  },[symbol])

  if(loading) return <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><h3 className="font-semibold">🤖 AI Analysis</h3><p className="text-sm text-gray-500">Scoring {symbol} out of 100...</p></div>
  if(!data) return null

  const pct = data.score
  const circumference = 2 * Math.PI * 44
  const offset = circumference - (pct/100)*circumference

  return (
    <div className="glass-premium rounded-2xl p-5 border border-gray-700/50 space-y-4 shadow-xl">
      <div className="flex flex-col md:flex-row gap-5 items-center">
        <div className="relative flex-shrink-0">
          <svg width="118" height="118" className="-rotate-90 drop-shadow-lg">
            <defs>
              <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={pct>=65 ? '#22c55e' : pct>=45 ? '#eab308' : '#ef4444'} stopOpacity="1"/>
                <stop offset="100%" stopColor={pct>=65 ? '#16a34a' : pct>=45 ? '#ca8a04' : '#dc2626'} stopOpacity="0.9"/>
              </linearGradient>
            </defs>
            <circle cx="59" cy="59" r="44" stroke="#1F2937" strokeWidth="10" fill="none" opacity="0.9"/>
            <circle cx="59" cy="59" r="44" stroke="url(#aiGrad)" strokeWidth="10" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="drop-shadow-md"/>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="ai-score text-3xl tracking-tighter">{pct}<span className="text-sm font-normal text-gray-500 ml-0.5">/100</span></span>
            <span className={`text-xs font-bold tracking-widest uppercase ${data.verdictColor}`}>{data.verdict}</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="ai-premium text-lg font-bold tracking-tight">AI Score — {symbol.replace('.NS','')} <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-bold border tracking-wide ${data.verdictBg} ${data.verdictBorder} ${data.verdictColor}`}>{data.verdict}</span></h3>
          <p className="ai-body text-sm text-gray-200 mt-2 leading-relaxed font-medium">{data.summary}</p>
          <p className="text-xs text-gray-500 mt-2 font-mono">Sources: {data.sources.join(' • ')} • {new Date(data.updatedAt).toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-gray-800/60 backdrop-blur rounded-xl p-3 border border-gray-700/30">
          <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">3M Forecast</p>
          <p className="ai-premium font-bold text-lg">₹{data.forecast.forecast3m?.toFixed(2)}</p>
          <p className="text-xs text-gray-600">25% of target</p>
        </div>
        <div className="bg-gray-800/60 backdrop-blur rounded-xl p-3 border border-gray-700/30">
          <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">6M Forecast</p>
          <p className="ai-premium font-bold text-lg">₹{data.forecast.forecast6m?.toFixed(2)}</p>
          <p className="text-xs text-gray-600">50% of target</p>
        </div>
        <div className="bg-blue-950/40 border border-blue-700/50 rounded-xl p-3 backdrop-blur">
          <p className="text-xs text-blue-300 font-medium tracking-wide uppercase">12M Target</p>
          <p className="ai-premium font-bold text-lg text-blue-400">₹{data.forecast.target?.toLocaleString('en-IN')}</p>
          <p className="text-xs font-bold text-blue-400">{data.forecast.upside>0?'+':''}{data.forecast.upside?.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-green-950/20 backdrop-blur rounded-2xl p-4 border border-green-800/30">
          <h4 className="ai-premium text-sm font-bold text-green-400 mb-3 tracking-tight flex items-center gap-2">✅ Pros <span className="text-xs font-normal text-green-600">— why it’s good</span></h4>
          <ul className="space-y-2.5">
            {data.pros.map((p,i)=>{
              const s = p.includes('RSI healthy') ? 'Balanced energy — good for steady rise' :
                        p.includes('Positive 1M') ? `Went up ${p.match(/[\d.]+%/)[0]} last month` :
                        p.includes('Target upside') ? `Experts see +${p.match(/[\d.]+%/)[0]} upside` :
                        p.includes('Uptrend') ? 'Price is going up nicely' :
                        p.includes('MACD bullish') ? 'Short-term power is strong' :
                        p.includes('Attractive P/E') ? 'Good price for earnings' :
                        p.includes('Excellent ROE') || p.includes('Good ROE') ? 'Very good at making profit' :
                        p.includes('High ROCE') ? 'Uses money very efficiently' :
                        p.includes('Strong 1M') ? `Strong last month +${p.match(/[\d.]+%/)[0]}` :
                        p.includes('Strong 1Y') ? `Great last year +${p.match(/[\d.]+%/)[0]}` :
                        p;
              return <li key={i} className="ai-body text-sm text-gray-100 flex gap-2.5 leading-relaxed bg-green-900/10 rounded-xl p-2.5 border border-green-800/20"><span className="text-green-400 text-lg leading-none">✓</span><span>{s}<span className="block text-xs text-gray-500 font-mono mt-0.5">{p}</span></span></li>
            })}
          </ul>
        </div>
        <div className="bg-red-950/20 backdrop-blur rounded-2xl p-4 border border-red-900/30">
          <h4 className="ai-premium text-sm font-bold text-red-400 mb-3 tracking-tight flex items-center gap-2">⚠️ Cons <span className="text-xs font-normal text-red-600">— watch out</span></h4>
          <ul className="space-y-2.5">
            {data.cons.map((c,i)=>{
              const s = c.includes('Price below SMA') ? 'Price is below average — falling a bit' :
                        c.includes('MACD bearish') ? 'Short-term power is weak' :
                        c.includes('Very high P/E') ? `A bit expensive (P/E ${c.match(/[\d.]+/)[0]})` :
                        c.includes('High P/E') ? `Costly (P/E ${c.match(/[\d.]+/)[0]})` :
                        c.includes('Low ROE') ? 'Not very efficient with money' :
                        c.includes('Weak ROE') ? 'Low profit efficiency' :
                        c.includes('Low ROCE') ? 'Not great at using capital' :
                        c.includes('Negative 1M') || c.includes('Weak 1M') ? `Fell ${c.match(/[\d.-]+%/)[0]} last month` :
                        c.includes('RSI overbought') ? 'Price ran up fast — may cool down' :
                        c.includes('RSI oversold') ? 'Price fell a lot — may bounce' :
                        c;
              return <li key={i} className="ai-body text-sm text-gray-100 flex gap-2.5 leading-relaxed bg-red-900/10 rounded-xl p-2.5 border border-red-800/20"><span className="text-red-400 text-lg leading-none">•</span><span>{s}<span className="block text-xs text-gray-500 font-mono mt-0.5">{c}</span></span></li>
            })}
          </ul>
        </div>
      </div>

      <div className={`rounded-lg p-3 border ${data.verdictBorder} ${data.verdictBg}`}>
        <p className="text-xs font-semibold">🔗 Prediction ↔ News Alignment</p>
        <p className="text-sm mt-1">{data.newsAlignment}</p>
        <p className="text-xs text-gray-500 mt-1">Past: 1M {data.past.ret1m?.toFixed(1)}% • 1Y {data.past.ret1y?.toFixed(1)}% • RSI {data.past.rsi?.toFixed(1)} • Present: P/E {data.present.pe} • Forecast uses consensus + technicals</p>
      </div>

      <p className="text-xs text-gray-600">⚠️ Perfect & reliable is goal — AI is rule-based on live data, not SEBI-registered advice. Verify with broker.</p>
    </div>
  )
}
