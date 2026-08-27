import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Screener({ onSelect }){
  const [movers, setMovers] = useState({gainers:[], losers:[], all:[]})
  const [period, setPeriod] = useState('1d')
  const [index, setIndex] = useState('NIFTY 50')
  const [showDetail, setShowDetail] = useState(null)
  useEffect(()=>{ axios.get(`/api/stocks/movers?period=${period}&index=${encodeURIComponent(index)}`).then(r=>setMovers(r.data)).catch(()=>{}) },[period, index])
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="ai-premium font-bold text-sm tracking-tight">🔥 Movers</h3>
        <select value={index} onChange={e=>setIndex(e.target.value)} className="glass-card text-xs rounded-xl px-2 py-1.5">
          <option>NIFTY 50</option><option>SENSEX</option><option>BANK NIFTY</option><option>NIFTY IT</option><option>NIFTY MIDCAP</option>
        </select>
      </div>
      <div className="flex gap-1 glass-card rounded-xl p-1 mb-3 w-fit">
        {[{k:'1d',l:'Today'},{k:'5d',l:'Week'},{k:'1mo',l:'Month'}].map(b=>(
          <button key={b.k} onClick={()=>setPeriod(b.k)} className={`px-2 py-1 text-xs rounded-lg font-bold transition-all ${period===b.k?'bg-blue-600 text-white shadow-lg':'text-gray-400 hover:text-white'}`}>{b.l}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button onClick={()=>setShowDetail('gainers')} className="text-xs text-green-400 hover:text-green-300 font-semibold text-left">More →</button>
        <button onClick={()=>setShowDetail('losers')} className="text-xs text-red-400 hover:text-red-300 font-semibold text-right">More →</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-green-400 font-bold mb-1">Top 5 Gainers</p>
          <div className="space-y-1">
            {movers.gainers.map((q,i)=>(
              <button key={q.symbol} onClick={()=>onSelect(q.symbol.replace('.NS',''))} className="w-full grid grid-cols-12 items-center py-1.5 px-2 hover:bg-gray-800 rounded-lg text-left">
                <span className="col-span-1 text-xs font-bold text-gray-500">{i+1}</span>
                <span className="col-span-7 text-xs font-bold truncate">{q.symbol.replace('.NS','')}</span>
                <span className="col-span-4 text-xs font-bold text-green-400 text-right">+{q.regularMarketChangePercent?.toFixed(2)}%</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-red-400 font-bold mb-1">Top 5 Losers</p>
          <div className="space-y-1">
            {movers.losers.map((q,i)=>(
              <button key={q.symbol} onClick={()=>onSelect(q.symbol.replace('.NS',''))} className="w-full grid grid-cols-12 items-center py-1.5 px-2 hover:bg-gray-800 rounded-lg text-left">
                <span className="col-span-1 text-xs font-bold text-gray-500">{i+1}</span>
                <span className="col-span-7 text-xs font-bold truncate">{q.symbol.replace('.NS','')}</span>
                <span className="col-span-4 text-xs font-bold text-red-400 text-right">{q.regularMarketChangePercent?.toFixed(2)}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-3">Click any to analyze • More for full list</p>
      {showDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setShowDetail(null)}>
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="ai-premium font-bold">{showDetail==='gainers' ? '📈 All Gainers' : '📉 All Losers'} — {index}</h3>
              <button onClick={()=>setShowDetail(null)} className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center">✕</button>
            </div>
            <div className="overflow-auto max-h-[60vh] p-2">
              {(showDetail==='gainers' ? movers.all.filter(q=>q.regularMarketChangePercent>0) : movers.all.filter(q=>q.regularMarketChangePercent<0)).slice(0,30).map((q,i)=>(
                <button key={q.symbol} onClick={()=>{ onSelect(q.symbol.replace('.NS','')); setShowDetail(null)}} className="w-full grid grid-cols-12 items-center px-3 py-2.5 hover:bg-gray-800 rounded-xl text-left">
                  <span className="col-span-1 text-xs font-bold">{i+1}</span>
                  <span className="col-span-5 ai-premium text-sm font-bold">{q.symbol.replace('.NS','')}</span>
                  <span className="col-span-3 text-sm font-mono text-right">₹{q.regularMarketPrice?.toFixed(2)}</span>
                  <span className={`col-span-3 text-sm font-bold text-right ${q.regularMarketChangePercent>=0?'text-green-400':'text-red-400'}`}>{q.regularMarketChangePercent>0?'+':''}{q.regularMarketChangePercent?.toFixed(2)}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
