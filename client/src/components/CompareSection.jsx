import { useState, useEffect } from 'react'
import axios from 'axios'
import StockChart from './StockChart.jsx'
import SearchAutocomplete from './SearchAutocomplete.jsx'

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

function CompareCard({ symbol, onRemove }){
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    setLoading(true)
    Promise.all([
      axios.get(`/api/stocks/analysis/${symbol}`),
      axios.get(`/api/stocks/history/${symbol}?period=3mo&interval=1d`)
    ]).then(([a,h])=>{
      setData(a.data)
      setHistory(h.data)
    }).catch(()=>{})
      .finally(()=>setLoading(false))
  },[symbol])

  if(loading) return <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 min-h-[400px] flex items-center justify-center text-gray-500">Loading {symbol}...</div>
  if(!data) return <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">Failed {symbol}</div>

  return (
    <div className="glass-card rounded-2xl flex flex-col hover:border-blue-500/30">
      <div className="p-3 border-b border-gray-700/30 flex justify-between items-start">
        <div>
          <h3 className="ai-premium font-bold">{symbol}.NS</h3>
          <p className="text-sm font-bold" style={{color: data.change>=0 ? '#22c55e' : '#ef4444'}}>₹{data.price?.toFixed(2)} <span className="text-xs font-mono">{data.change?.toFixed(2)} ({data.changePercent?.toFixed(2)}%)</span></p>
          <p className="text-xs text-gray-500 ai-body">{data.indicators?.signal} • RSI {data.indicators?.rsi?.toFixed(1)}</p>
        </div>
        <button onClick={()=>onRemove(symbol)} className="text-xs glass-card hover:bg-red-900/40 px-2 py-1 rounded-xl">✕</button>
      </div>
      <div className="p-2">
        {history.length ? <StockChart data={history} /> : <p className="text-center text-xs text-gray-500 py-8">No chart</p>}
      </div>
      {data.kpi && (
        <div className="p-3 grid grid-cols-3 gap-2 text-xs">
          <KPI label="Open" value={fmt(data.kpi.open)} />
          <KPI label="High" value={fmt(data.kpi.high)} />
          <KPI label="Low" value={fmt(data.kpi.low)} />
          <KPI label="Mkt Cap" value={data.kpi.mktCap} />
          <KPI label="P/E" value={fmt(data.kpi.pe)} />
          <KPI label="Volume" value={fmtVol(data.kpi.volume)} />
          <KPI label="Prev Close" value={fmt(data.kpi.prevClose)} />
          <KPI label="52W High" value={data.kpi.week52High} />
          <KPI label="52W Low" value={data.kpi.week52Low} />
        </div>
      )}
      {data.fundamentals && (
        <div className="px-3 pb-3 grid grid-cols-3 gap-2 text-xs">
          <KPI label="ROE" value={data.fundamentals.roe ? `${data.fundamentals.roe}%` : '-'} />
          <KPI label="Div Yield" value={data.fundamentals.dividendYield || '-'} />
          <KPI label="Book" value={data.fundamentals.bookValue || '-'} />
        </div>
      )}
    </div>
  )
}
function KPI({label, value}){
  return <div className="glass-card rounded-xl p-2 hover:border-blue-500/20"><p className="text-[10px] text-gray-500 tracking-wide uppercase">{label}</p><p className="font-bold truncate text-xs">{value ?? '-'}</p></div>
}

export default function CompareSection({ initialSymbol }){
  const [stocks, setStocks] = useState(()=> initialSymbol ? [initialSymbol] : ['RELIANCE'])
  const [input, setInput] = useState('')

  const addBySymbol = (sym)=>{
    const s = sym.trim().toUpperCase().replace('.NS','')
    if(!s) return
    if(stocks.includes(s)) { setInput(''); return }
    if(stocks.length >= 4) { alert('Max 4 stocks for compare'); return }
    setStocks([...stocks, s])
    setInput('')
  }
  const add = (e)=>{
    e.preventDefault()
    addBySymbol(input)
  }
  const remove = (sym)=> setStocks(stocks.filter(s=>s!==sym))

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="glass-card rounded-2xl p-4 mb-4">
        <h2 className="ai-premium font-bold mb-2 tracking-tight">⚖️ Compare Stocks <span className="text-xs font-normal text-gray-500">max 4 • same layout (chart + KPI)</span></h2>
        <div className="flex gap-2 mb-3 items-start">
          <div className="flex-1 max-w-xs">
            <SearchAutocomplete value={input} onChange={setInput} onSelect={addBySymbol} placeholder="Tata Motors, Infosys..." onEnter={addBySymbol} />
          </div>
          <button type="button" onClick={()=>addBySymbol(input)} className="px-4 py-2 tv-gradient rounded-xl text-sm font-bold shadow-lg mt-0.5">Add</button>
          <span className="text-xs text-gray-500 self-center font-mono">{stocks.length}/4</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {stocks.map(s=>(
            <span key={s} className="bg-gray-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">{s}.NS <button onClick={()=>remove(s)} className="text-gray-400 hover:text-red-400">✕</button></span>
          ))}
          {stocks.length===0 && <span className="text-sm text-gray-500">Add up to 4 stocks to compare</span>}
        </div>
      </div>

      {stocks.length>0 ? (
        <div className={`grid gap-4 ${stocks.length===1?'grid-cols-1': stocks.length===2?'grid-cols-1 md:grid-cols-2': stocks.length===3?'grid-cols-1 md:grid-cols-3': 'grid-cols-1 md:grid-cols-2'}`}>
          {stocks.map(sym=> <CompareCard key={sym} symbol={sym} onRemove={remove} />)}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-12">Add stocks above to compare</p>
      )}

      {/* Quick presets */}
      <div className="mt-4 flex gap-2 flex-wrap text-xs">
        <span className="text-gray-500">Presets:</span>
        <button onClick={()=>setStocks(['RELIANCE','TCS','INFY','HDFCBANK'])} className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700">Nifty Top 4</button>
        <button onClick={()=>setStocks(['HDFCBANK','ICICIBANK','SBIN','KOTAKBANK'])} className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700">Banks</button>
        <button onClick={()=>setStocks(['TCS','INFY','WIPRO','HCLTECH'])} className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700">IT Pack</button>
      </div>
    </div>
  )
}
