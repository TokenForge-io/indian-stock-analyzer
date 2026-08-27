import { useEffect, useState } from 'react'
import axios from 'axios'

export default function TargetPanel({ symbol }){
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    if(!symbol) return
    setLoading(true)
    axios.get(`/api/stocks/target/${symbol}`)
      .then(r=>setData(r.data))
      .catch(()=>setData(null))
      .finally(()=>setLoading(false))
  },[symbol])

  if(loading) return <div className="glass-card rounded-2xl p-4"><h3 className="ai-premium font-bold mb-2 tracking-tight">🎯 Target Price</h3><p className="text-sm text-gray-500 ai-body">Loading targets for {symbol}...</p></div>
  if(!data) return null

  const upsideColor = data.consensus.upside >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="ai-premium font-bold mb-3 tracking-tight">🎯 Target Price — {symbol.replace('.NS','')}</h3>
      
      {/* KPI */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="glass-card rounded-xl p-3 text-center hover:border-blue-500/20">
          <p className="text-xs text-gray-500 tracking-wide uppercase">Current</p>
          <p className="ai-premium text-lg font-bold">₹{data.currentPrice?.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500">Live</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center border border-blue-500/30 hover:border-blue-500/40">
          <p className="text-xs text-gray-400 tracking-wide uppercase">Consensus (12M)</p>
          <p className="ai-premium text-lg font-bold text-blue-400">₹{data.consensus.target?.toLocaleString('en-IN')}</p>
          <p className={`text-xs font-bold ${upsideColor}`}>{data.consensus.upside >0 ? '+' : ''}{data.consensus.upside.toFixed(1)}% • {data.consensus.rating}</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center hover:border-blue-500/20">
          <p className="text-xs text-gray-500 tracking-wide uppercase">Analysts</p>
          <p className="ai-premium text-lg font-bold">{data.consensus.count}</p>
          <p className="text-xs text-gray-500">Reputed</p>
        </div>
      </div>

      {/* Progress bar upside */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>52W Low ₹{data.week52Low || '-'}</span>
          <span>52W High ₹{data.week52High || '-'}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-green-500" style={{width: `${Math.min(100, Math.max(5, ((data.currentPrice - (data.week52Low||data.currentPrice*0.8)) / ((data.week52High||data.currentPrice*1.3)-(data.week52Low||data.currentPrice*0.8)))*100 ))}%`}} />
        </div>
        <p className="text-xs text-gray-600 mt-1">Target vs 52W range • Holding: 12M (6M for Nomura)</p>
      </div>

      {/* Broker table */}
      <div className="overflow-auto max-h-[340px]">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 sticky top-0 bg-gray-900">
            <tr><th className="text-left py-2">Source</th><th className="text-right">Target</th><th className="text-right">Upside</th><th className="text-center">Rating</th><th className="text-center">Hold</th><th className="text-right">Date</th></tr>
          </thead>
          <tbody>
            {data.targets.map((t,i)=>(
              <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/50">
                <td className="py-2 font-medium">{t.source}</td>
                <td className="text-right">₹{t.target.toLocaleString('en-IN')}</td>
                <td className={`text-right ${t.upside>=0?'text-green-400':'text-red-400'}`}>{t.upside>0?'+':''}{t.upside.toFixed(1)}%</td>
                <td className="text-center"><span className={`px-2 py-0.5 rounded text-xs ${t.rating==='BUY'?'bg-green-900/40 text-green-400': t.rating==='Overweight'?'bg-blue-900/40 text-blue-400':'bg-yellow-900/40 text-yellow-400'}`}>{t.rating}</span></td>
                <td className="text-center text-xs">{t.duration}</td>
                <td className="text-right text-xs text-gray-500">{t.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600 mt-3">{data.disclaimer}</p>
    </div>
  )
}
