import { useState } from 'react'

export default function ChartControls({ indicators, onChange }){
  return (
    <div className="glass-card rounded-2xl p-3">
      <h3 className="ai-premium font-bold text-sm mb-2 flex items-center justify-between">
        <span>📊 Chart Indicators</span>
        <span className="text-xs font-normal text-gray-500">TradingView-style</span>
      </h3>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {[
          {k:'sma', label:'SMA 20/50'},
          {k:'bb', label:'BB'},
          {k:'volume', label:'Vol'},
          {k:'rsi', label:'RSI'},
          {k:'macd', label:'MACD'},
        ].map(btn=>(
          <button key={btn.k} onClick={()=>onChange({...indicators, [btn.k]: !indicators[btn.k]})} className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${indicators[btn.k] ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
            {btn.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-600">Toggle — updates chart instantly • Sync scroll</p>
    </div>
  )
}
