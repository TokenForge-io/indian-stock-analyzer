import { useState } from 'react'
import NewsPanel from './NewsPanel.jsx'
import TargetPanel from './TargetPanel.jsx'
import RatiosPanel from './RatiosPanel.jsx'
import AIScorePanel from './AIScorePanel.jsx'
import DocumentsPanel from './DocumentsPanel.jsx'

export default function StockTabs({ symbol }){
  const [tab, setTab] = useState('ai') // 'ai' | 'news' | 'target' | 'ratios' | 'docs'
  return (
    <div>
      <div className="flex gap-1 md:gap-2 mb-3 p-1 glass-card rounded-2xl">
        <button onClick={()=>setTab('ai')} className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold border transition-all ${tab==='ai' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>🤖 AI 100</button>
        <button onClick={()=>setTab('news')} className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold border transition-all ${tab==='news' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>📰 News</button>
        <button onClick={()=>setTab('target')} className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold border transition-all ${tab==='target' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>🎯 Target</button>
        <button onClick={()=>setTab('ratios')} className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold border transition-all ${tab==='ratios' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>📈 Ratios</button>
        <button onClick={()=>setTab('docs')} className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold border transition-all ${tab==='docs' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>📄 Documents</button>
      </div>
      {tab==='ai' ? <AIScorePanel symbol={symbol} /> : tab==='news' ? <NewsPanel symbol={symbol} /> : tab==='target' ? <TargetPanel symbol={symbol} /> : tab==='ratios' ? <RatiosPanel symbol={symbol} /> : <DocumentsPanel symbol={symbol} />}
    </div>
  )
}
