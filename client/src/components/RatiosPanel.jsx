import { useEffect, useState } from 'react'
import axios from 'axios'

export default function RatiosPanel({ symbol }){
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    if(!symbol) return
    setLoading(true)
    axios.get(`/api/stocks/ratios/${symbol}`)
      .then(r=>setData(r.data))
      .catch(()=>setData(null))
      .finally(()=>setLoading(false))
  },[symbol])

  if(loading) return <div className="glass-card rounded-2xl p-4"><h3 className="ai-premium font-bold mb-2 tracking-tight">📈 Financial Ratios</h3><p className="text-sm text-gray-500 ai-body">Loading ratios for {symbol}...</p></div>
  if(!data) return <div className="glass-card rounded-2xl p-4"><p className="text-sm text-gray-500">No ratios found</p></div>

  const pct = (v) => (!v || v === '-' ? '-' : /\(/.test(String(v)) ? String(v) : `${v}%`)
  const raw = (v) => (!v || v === '-' ? '-' : v)

  const items = [
    { label: 'P/E', value: raw(data.pe), desc: 'Price to Earnings' },
    { label: 'ROCE', value: data.roce && data.roce !== '-' ? `${data.roce}%` : raw(data.roceLatest), desc: 'Return on Capital' },
    { label: 'ROE', value: pct(data.roe), desc: 'Return on Equity' },
    { label: 'Dividend Yield', value: raw(data.dividendYield), desc: 'Yield %' },
    { label: 'Book Value', value: raw(data.bookValue), desc: '₹ per share' },
    { label: 'Face Value', value: raw(data.faceValue), desc: '₹ per share' },
    { label: 'Market Cap', value: raw(data.marketCap), desc: 'Total value' },
    { label: '52W High', value: raw(data.week52High), desc: '52 week' },
    { label: '52W Low', value: raw(data.week52Low), desc: '52 week' },
    { label: 'Debtor Days', value: raw(data.debtorDays), desc: 'Avg collection' },
    { label: 'Inventory Days', value: raw(data.inventoryDays), desc: 'Stock days' },
    { label: 'ROCE %', value: raw(data.roceLatest), desc: 'Latest' },
  ];

  const source = data.source || 'Screener.in'
  const sourceUrl = source === 'Screener.in'
    ? `https://www.screener.in/company/${symbol.replace('.NS','')}/`
    : `https://finance.yahoo.com/quote/${symbol.replace('.NS','')}.NS`

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="ai-premium font-bold mb-1 tracking-tight">📈 Financial Ratios — {symbol.replace('.NS','')} <span className="text-xs font-normal text-gray-500">via {source}</span></h3>
      <p className="text-xs text-gray-600 mb-3 ai-body">Key valuation & efficiency ratios • Updates quarterly</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((it,i)=>(
          <div key={i} className="glass-card rounded-xl p-3 hover:border-blue-500/20">
            <p className="text-xs text-gray-500 tracking-wide uppercase">{it.label}</p>
            <p className="ai-premium font-bold text-sm">{it.value || '-'}</p>
            <p className="text-xs text-gray-600">{it.desc}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-3">Source: {source} • <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-blue-400">View full</a></p>
    </div>
  )
}
