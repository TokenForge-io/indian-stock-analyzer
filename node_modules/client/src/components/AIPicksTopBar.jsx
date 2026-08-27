import { useEffect, useState } from 'react'
import axios from 'axios'

function PickCard({ s, onSelect, color }){
  const isPos = s.upside >=0
  return (
    <button onClick={()=>onSelect(s.symbol)} className="flex-1 min-w-[140px] bg-gray-800 hover:bg-gray-700 border rounded-lg p-2.5 text-left" style={{borderColor: color}}>
      <div className="flex justify-between items-start">
        <p className="font-bold text-sm">{s.symbol}</p>
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-900 border" style={{color, borderColor: color}}>{s.score}/100</span>
      </div>
      <p className="text-xs">₹{s.price?.toFixed(0)} → <span className="font-semibold" style={{color}}>₹{s.target?.toFixed(0)}</span></p>
      <p className={`text-xs font-semibold ${isPos?'text-green-400':'text-red-400'}`}>{isPos?'+':''}{s.upside?.toFixed(1)}% • {s.verdict}</p>
      <p className="text-[10px] text-gray-500">P/E {s.pe || '-'} • RSI {s.rsi?.toFixed(0) || '-'}</p>
    </button>
  )
}

export default function AIPicksTopBar({ onSelect }){
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  useEffect(()=>{
    axios.get('/api/stocks/ai-picks')
      .then(r=>setData(r.data))
      .catch(()=>{})
      .finally(()=>setLoading(false))
  },[])

  if(loading) return <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 p-3"><p className="text-sm text-gray-400 text-center">🤖 AI scanning 55 NSE stocks for Top 10 picks...</p></div>
  if(!data) return null

  return (
    <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="font-bold text-sm">🤖 Top AI Picks <span className="text-xs font-normal text-gray-500">• Top 10 across NSE • {new Date(data.updatedAt).toLocaleTimeString('en-IN')} • {data.scanned} scanned</span></h2>
          <button onClick={()=>setExpanded(!expanded)} className="text-xs bg-gray-800 px-3 py-1 rounded border border-gray-700 hover:bg-gray-700">{expanded ? 'Hide' : 'Show'}</button>
        </div>
        {expanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-semibold text-green-400 mb-1.5 flex items-center gap-1">🟢 Steady Growth <span className="text-gray-500 font-normal">• Low risk • 12M hold</span></p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.steady.map(s=> <PickCard key={s.symbol} s={s} onSelect={onSelect} color="#22c55e" />)}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-yellow-400 mb-1.5 flex items-center gap-1">🟡 Mid Growth <span className="text-gray-500 font-normal">• Balanced</span></p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.mid.map(s=> <PickCard key={s.symbol} s={s} onSelect={onSelect} color="#eab308" />)}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-400 mb-1.5 flex items-center gap-1">🔴 Aggressive <span className="text-gray-500 font-normal">• High risk/high reward</span></p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.aggressive.map(s=> <PickCard key={s.symbol} s={s} onSelect={onSelect} color="#f97316" />)}
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-600 mt-2">{data.disclaimer} • Click any to analyze • Scores: Steady low-vol, Mid balanced, Aggressive high-upside</p>
      </div>
    </div>
  )
}
