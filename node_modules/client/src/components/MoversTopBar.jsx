import { useEffect, useState } from 'react'
import axios from 'axios'

export default function MoversTopBar({ onSelect }){
  const [period, setPeriod] = useState('1d')
  const [index, setIndex] = useState('NIFTY 50')
  const [indices, setIndices] = useState(['NIFTY 50','SENSEX','BANK NIFTY','NIFTY IT','NIFTY MIDCAP'])
  const [data, setData] = useState({gainers:[], losers:[], all:[]})
  const [loading, setLoading] = useState(false)

  const fetchMovers = async(p, idx)=>{
    setLoading(true)
    try{
      const r = await axios.get(`/api/stocks/movers?period=${p}&index=${encodeURIComponent(idx)}`)
      setData(r.data)
    }catch{}
    setLoading(false)
  }
  useEffect(()=>{ axios.get('/api/stocks/indices/list').then(r=>setIndices(r.data)).catch(()=>{}); },[])
  useEffect(()=>{ fetchMovers(period, index) },[period, index])

  const label = period==='1d' ? 'Today' : period==='5d' ? 'Week' : 'Month'

  return (
    <div className="glass-card rounded-none border-x-0 border-t-0">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <h3 className="ai-premium text-sm font-bold tracking-tight">🔥 Top Movers</h3>
            <select value={index} onChange={e=>setIndex(e.target.value)} className="glass-card text-xs rounded-xl px-2 py-1.5 text-white">
              {indices.map(idx=> <option key={idx} value={idx}>{idx}</option>)}
            </select>
            <span className="text-xs text-gray-500">• {label}</span>
          </div>
          <div className="flex gap-1 glass-card rounded-xl p-1">
            {[
              {k:'1d', l:'Today'},
              {k:'5d', l:'Week'},
              {k:'1mo', l:'Month'}
            ].map(btn=>(
              <button key={btn.k} onClick={()=>setPeriod(btn.k)} className={`px-3 py-1 text-xs rounded-lg font-bold transition-all ${period===btn.k ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}>{btn.l}</button>
            ))}
          </div>
          {loading && <span className="text-xs text-gray-500">Loading...</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="ai-premium text-xs font-bold text-green-400 mb-2 tracking-wide">Top 5 Gainers — {label}</p>
            <div className="space-y-1">
              <div className="grid grid-cols-12 text-xs text-gray-500 px-2 py-1">
                <span className="col-span-1">#</span><span className="col-span-5">Symbol</span><span className="col-span-3 text-right">Price</span><span className="col-span-3 text-right">Change</span>
              </div>
              {data.gainers.map((q,i)=>(
                <button key={q.symbol} onClick={()=>onSelect?.(q.symbol.replace('.NS','').replace('^',''))} className="w-full grid grid-cols-12 items-center px-2 py-2 glass-card hover:border-green-500/30 rounded-xl text-left">
                  <span className="col-span-1 text-xs font-bold text-gray-500">{i+1}</span>
                  <span className="col-span-5 ai-premium text-xs font-bold truncate">{q.symbol.replace('.NS','')}</span>
                  <span className="col-span-3 text-xs font-mono text-right">₹{q.regularMarketPrice?.toFixed(2)}</span>
                  <span className="col-span-3 text-xs font-bold text-green-400 text-right">+{q.regularMarketChangePercent?.toFixed(2)}%</span>
                </button>
              ))}
              {!data.gainers.length && !loading && <span className="text-xs text-gray-500">No data</span>}
            </div>
          </div>
          <div>
            <p className="ai-premium text-xs font-bold text-red-400 mb-2 tracking-wide">Top 5 Losers — {label}</p>
            <div className="space-y-1">
              <div className="grid grid-cols-12 text-xs text-gray-500 px-2 py-1">
                <span className="col-span-1">#</span><span className="col-span-5">Symbol</span><span className="col-span-3 text-right">Price</span><span className="col-span-3 text-right">Change</span>
              </div>
              {data.losers.map((q,i)=>(
                <button key={q.symbol} onClick={()=>onSelect?.(q.symbol.replace('.NS','').replace('^',''))} className="w-full grid grid-cols-12 items-center px-2 py-2 glass-card hover:border-red-500/30 rounded-xl text-left">
                  <span className="col-span-1 text-xs font-bold text-gray-500">{i+1}</span>
                  <span className="col-span-5 ai-premium text-xs font-bold truncate">{q.symbol.replace('.NS','')}</span>
                  <span className="col-span-3 text-xs font-mono text-right">₹{q.regularMarketPrice?.toFixed(2)}</span>
                  <span className="col-span-3 text-xs font-bold text-red-400 text-right">{q.regularMarketChangePercent?.toFixed(2)}%</span>
                </button>
              ))}
              {!data.losers.length && !loading && <span className="text-xs text-gray-500">No data</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
