import { useEffect, useState } from 'react'
import axios from 'axios'

export default function NewsPanel({ symbol }){
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    if(!symbol) return
    setLoading(true)
    axios.get(`/api/stocks/news/${symbol}`)
      .then(r=>setNews(r.data))
      .catch(()=>setNews([]))
      .finally(()=>setLoading(false))
  },[symbol])

  if(loading) return <div className="glass-card rounded-2xl p-4"><h3 className="ai-premium font-bold mb-2 tracking-tight">📰 Latest News</h3><p className="text-sm text-gray-500 ai-body">Loading news for {symbol}...</p></div>
  if(!news.length) return null

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="ai-premium font-bold mb-3 tracking-tight">📰 Latest News — {symbol.replace('.NS','')}</h3>
      <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
        {news.map((n,i)=>(
          <a key={i} href={n.link} target="_blank" rel="noreferrer" className="block p-3 glass-card hover:border-blue-500/30 rounded-xl transition-all">
            <p className="ai-body text-sm font-medium leading-snug line-clamp-2">{n.title}</p>
            <p className="text-xs text-gray-500 mt-1 font-mono">{n.source} • {n.timeAgo} • {n.pubDate ? new Date(n.pubDate).toLocaleDateString('en-IN') : ''}</p>
          </a>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-2">via Google News • updates every 10 min • click to read</p>
    </div>
  )
}
