import { useEffect, useState } from 'react'
import axios from 'axios'
import SearchAutocomplete from './SearchAutocomplete.jsx'

const DEFAULT = []

export default function Watchlist({ onSelect }){
  const [list, setList] = useState(()=>{
    const saved = localStorage.getItem('watchlist')
    if(saved){
      try{ const parsed = JSON.parse(saved); return Array.isArray(parsed) ? parsed : [] }catch{ return [] }
    }
    return DEFAULT
  })
  const [quotes, setQuotes] = useState([])
  const [input, setInput] = useState('')

  const fetchQuotes = async()=>{
    if(!list.length){ setQuotes([]); return } // clear stale quotes when list empties
    try{
      const res = await axios.post('/api/stocks/quotes', { symbols: list })
      setQuotes(res.data.filter(q=>q && q.regularMarketPrice))
    }catch{ /* backend down — keep last known quotes, next 5s tick retries */ }
  }
  useEffect(()=>{ fetchQuotes(); const id=setInterval(fetchQuotes,5000); return()=>clearInterval(id)},[list])
  useEffect(()=> localStorage.setItem('watchlist', JSON.stringify(list)),[list])

  const addBySymbol = (sym)=>{
    const s = sym.trim().toUpperCase().replace('.NS','')
    if(s && !list.includes(s)){ setList([...list, s]); setInput('') }
  }
  const add = (e)=>{
    e.preventDefault()
    addBySymbol(input)
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="ai-premium font-bold mb-3 tracking-tight">⭐ Watchlist</h3>
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <SearchAutocomplete value={input} onChange={setInput} onSelect={addBySymbol} placeholder="Tata Motors, Infosys..." onEnter={addBySymbol} />
        </div>
        <button type="button" onClick={()=>addBySymbol(input)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-semibold transition-all">Add</button>
      </div>
      <div className="space-y-1 max-h-80 overflow-auto">
        {quotes.length===0 && list.length===0 && (
          <div className="text-center py-8 border border-dashed border-gray-700 rounded-xl">
            <p className="text-sm text-gray-500">⭐ Your watchlist is empty</p>
            <p className="text-xs text-gray-600 mt-1">Search above to add stocks — e.g., Tata Motors, Infosys</p>
          </div>
        )}
        {quotes.map(q=>(
          <div key={q.symbol} className="flex justify-between items-center p-2.5 hover-premium rounded-xl border border-transparent group">
            <button onClick={()=>onSelect(q.symbol.replace('.NS',''))} className="flex-1 flex justify-between items-center text-left">
              <div><p className="ai-premium font-semibold text-sm">{q.symbol}</p><p className="text-xs text-gray-500">{q.shortName?.slice(0,22)}</p></div>
              <div className="text-right mr-2"><p className="text-sm font-bold font-mono">₹{q.regularMarketPrice?.toFixed(2)}</p><p className={`text-xs font-bold ${q.regularMarketChange>=0?'text-green-400':'text-red-400'}`}>{q.regularMarketChangePercent?.toFixed(2)}%</p></div>
            </button>
            <button onClick={(e)=>{ e.stopPropagation(); setList(list.filter(s=>s!==q.symbol.replace('.NS','')))}} className="w-7 h-7 rounded-full bg-gray-800 hover:bg-red-900/40 text-gray-400 hover:text-red-400 flex items-center justify-center opacity-60 group-hover:opacity-100 transition" title="Remove">✕</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={()=>setList([])} className="text-xs px-3 py-1.5 glass-card rounded-full hover:border-red-500/30">Clear all</button>
        <button onClick={()=>setList(['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN'])} className="text-xs px-3 py-1.5 glass-card rounded-full">Add Nifty top 6</button>
      </div>
    </div>
  )
}
