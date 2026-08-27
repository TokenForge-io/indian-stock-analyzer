import { useEffect, useState } from 'react'
import axios from 'axios'

export default function DocumentsPanel({ symbol }){
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const sym = symbol?.replace('.NS','').toUpperCase()

  useEffect(()=>{
    if(!sym) return
    setLoading(true)
    axios.get(`/api/stocks/info/${sym}`).then(r=>setInfo(r.data)).catch(()=>setInfo(null)).finally(()=>setLoading(false))
  },[sym])

  if(loading) return <div className="glass-card rounded-2xl p-4"><h3 className="ai-premium font-bold mb-2">📄 Documents</h3><p className="text-sm text-gray-500">Loading documents for {sym}...</p></div>

  const nseStock = info?.links?.nse || `https://www.nseindia.com/get-quotes/equity?symbol=${sym}`
  const bseStock = info?.links?.bse || `https://www.bseindia.com/corporates/ann.html`
  const docs = [
    { title: 'Annual Reports', desc: `Official filings for ${sym} (NSE)`, icon: '📑', href: `https://www.nseindia.com/companies-listing/corporate-filings-annual-reports?symbol=${sym}&tabIndex=equity`, badge: 'NSE India' },
    { title: 'Quarterly Results', desc: `Quarterly financials — ${sym} on NSE`, icon: '📊', href: `https://www.nseindia.com/companies-listing/corporate-filings-financial-results?symbol=${sym}&tabIndex=equity`, badge: 'NSE India' },
    { title: 'Announcements', desc: `Corporate announcements — ${sym} on NSE`, icon: '📢', href: `https://www.nseindia.com/companies-listing/corporate-filings-announcements?symbol=${sym}&tabIndex=equity`, badge: 'NSE India' },
    { title: 'Business Responsibility & Sustainability Reports', desc: `BRSR — ${sym} on NSE`, icon: '🌱', href: `https://www.nseindia.com/companies-listing/corporate-filings-bussiness-sustainabilitiy-reports?symbol=${sym}`, badge: 'NSE India' },
    { title: 'Corporate Actions', desc: `Dividends, splits, bonus — ${sym}`, icon: '💰', href: `https://www.nseindia.com/companies-listing/corporate-filings-actions?symbol=${sym}`, badge: 'NSE India' },
    { title: 'Shareholding Pattern', desc: `Promoter / FII / DII — ${sym}`, icon: '👥', href: `https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern?symbol=${sym}#`, badge: 'NSE India' },
  ]

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="ai-premium font-bold tracking-tight flex items-center gap-2">📄 Documents — {sym} <span className="text-xs font-normal text-gray-500">• Regulatory filings</span></h3>
      <p className="ai-body text-sm text-gray-400 mt-2 leading-relaxed">Explore the latest documents from the company, including regulatory filings and corporate disclosures that offer insight into company performance and strategy. Use these resources to support informed investment decisions.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {docs.map(d=>(
          <a key={d.title} href={d.href} target="_blank" rel="noreferrer" className="glass-card rounded-xl p-4 hover:border-blue-500/30 transition-all group">
            <div className="flex justify-between items-start">
              <span className="text-xl">{d.icon}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/30">{d.badge}</span>
            </div>
            <p className="ai-premium font-bold text-sm mt-2 group-hover:text-blue-400">{d.title}</p>
            <p className="text-xs text-gray-500 mt-1">{d.desc}</p>
            <p className="text-xs text-blue-400 mt-2 font-semibold">Open →</p>
          </a>
        ))}
      </div>

      <div className="mt-4 p-3 glass-card rounded-xl border border-gray-700/50">
        <p className="text-xs font-bold text-gray-400">🔗 More resources</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {info?.links?.moneycontrol && <a href={info.links.moneycontrol} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 glass-card rounded-full hover:border-blue-500/30 text-blue-400">MoneyControl</a>}
          {info?.links?.tradingview && <a href={info.links.tradingview} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 glass-card rounded-full hover:border-blue-500/30 text-blue-400">TradingView</a>}
          {info?.website && <a href={info.website} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 glass-card rounded-full hover:border-blue-500/30 text-blue-400">🌐 Company Site</a>}
          <a href={`https://www.screener.in/company/${sym}/`} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 glass-card rounded-full hover:border-blue-500/30 text-blue-400">Screener.in Full</a>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-3">Sources: Screener.in • BSE/NSE • Company website • Not SEBI advice</p>
    </div>
  )
}
