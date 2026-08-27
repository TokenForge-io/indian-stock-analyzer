import { useEffect, useRef, useState } from 'react'
import { createChart } from 'lightweight-charts'

export default function StockChart({ data, height = 360, compact = false }) {
  const ref = useRef()
  const volumeRef = useRef()
  const rsiRef = useRef()
  const macdRef = useRef()
  const [indicators, setIndicators] = useState({ sma: true, bb: false, volume: true, rsi: true, macd: false })
  const [chartType, setChartType] = useState('candle') // 'candle' | 'line'

  useEffect(() => {
    if (!ref.current || !data.length) return
    let chart, volumeChart, rsiChart, macdChart, ro, timeout
    const init = () => {
      if(!ref.current) return
      const w = ref.current.clientWidth || 300
      if(w < 10) { timeout = setTimeout(init, 100); return }
      ref.current.innerHTML = ''
      if(volumeRef.current) volumeRef.current.innerHTML = ''
      if(rsiRef.current) rsiRef.current.innerHTML = ''
      if(macdRef.current) macdRef.current.innerHTML = ''
      chart = createChart(ref.current, {
        width: w,
        height: compact ? 260 : height,
        layout: { background: { color: '#111827' }, textColor: '#9CA3AF' },
        grid: { vertLines: { color: 'rgba(55,65,81,0.25)' }, horzLines: { color: 'rgba(55,65,81,0.25)' } },
        timeScale: { borderColor: '#374151', timeVisible: true, visible: true },
        rightPriceScale: { borderColor: '#374151' },
        crosshair: { mode: 1 },
      })
      if(chartType==='candle'){
        const candleSeries = chart.addCandlestickSeries({ upColor: '#22c55e', downColor: '#ef4444', wickUpColor: '#22c55e', wickDownColor: '#ef4444' })
        candleSeries.setData(data.map(d => ({
          time: Math.floor(new Date(d.date).getTime()/1000),
          open: d.open, high: d.high, low: d.low, close: d.close
        })))
      } else {
        const lineSeries = chart.addLineSeries({ color: '#2962FF', lineWidth: 2 })
        lineSeries.setData(data.map(d => ({
          time: Math.floor(new Date(d.date).getTime()/1000),
          value: d.close
        })))
      }
      if(indicators.sma){
        const sma20 = chart.addLineSeries({ color: '#F59E0B', lineWidth: 1, priceLineVisible: false })
        sma20.setData(data.filter(d=>d.sma20).map(d=>({ time: Math.floor(new Date(d.date).getTime()/1000), value: d.sma20 })))
        const sma50 = chart.addLineSeries({ color: '#3B82F6', lineWidth: 1, priceLineVisible: false })
        sma50.setData(data.filter(d=>d.sma50).map(d=>({ time: Math.floor(new Date(d.date).getTime()/1000), value: d.sma50 })))
      }
      if(indicators.bb){
        const bbUpper = chart.addLineSeries({ color: 'rgba(99,102,241,0.6)', lineWidth: 1, priceLineVisible: false })
        bbUpper.setData(data.filter(d=>d.bbUpper).map(d=>({ time: Math.floor(new Date(d.date).getTime()/1000), value: d.bbUpper })))
        const bbLower = chart.addLineSeries({ color: 'rgba(99,102,241,0.6)', lineWidth: 1, priceLineVisible: false })
        bbLower.setData(data.filter(d=>d.bbLower).map(d=>({ time: Math.floor(new Date(d.date).getTime()/1000), value: d.bbLower })))
      }
      if(indicators.volume && volumeRef.current){
        volumeChart = createChart(volumeRef.current, {
          width: w, height: 80,
          layout: { background: { color: '#111827' }, textColor: '#6B7280' },
          grid: { vertLines: { visible: false }, horzLines: { visible: false } },
          timeScale: { visible: false },
          rightPriceScale: { visible: false },
        })
        const volSeries = volumeChart.addHistogramSeries({ color: '#3B82F6', priceFormat: { type: 'volume' } })
        volSeries.setData(data.map(d=>({ time: Math.floor(new Date(d.date).getTime()/1000), value: d.volume || 0, color: d.close >= d.open ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)' })))
        volumeChart.timeScale().setVisibleRange(chart.timeScale().getVisibleRange() || { from: 0, to: 100 })
        chart.timeScale().subscribeVisibleTimeRangeChange(range=>{ if(range && volumeChart) volumeChart.timeScale().setVisibleRange(range) })
      }
      if(indicators.rsi && rsiRef.current && data.some(d=>d.rsi)){
        rsiChart = createChart(rsiRef.current, {
          width: w, height: 90,
          layout: { background: { color: '#111827' }, textColor: '#6B7280' },
          grid: { vertLines: { color: 'rgba(55,65,81,0.2)' }, horzLines: { color: 'rgba(55,65,81,0.2)' } },
          timeScale: { visible: false },
          rightPriceScale: { borderColor: '#374151' },
        })
        const rsiLine = rsiChart.addLineSeries({ color: '#8b5cf6', lineWidth: 1.5 })
        rsiLine.setData(data.filter(d=>d.rsi).map(d=>({ time: Math.floor(new Date(d.date).getTime()/1000), value: d.rsi })))
        const overbought = rsiChart.addLineSeries({ color: 'rgba(239,68,68,0.5)', lineWidth: 1, lineStyle: 2 })
        const oversold = rsiChart.addLineSeries({ color: 'rgba(34,197,94,0.5)', lineWidth: 1, lineStyle: 2 })
        const times = data.filter(d=>d.rsi).map(d=>Math.floor(new Date(d.date).getTime()/1000))
        if(times.length){ overbought.setData(times.map(t=>({ time: t, value: 70 }))); oversold.setData(times.map(t=>({ time: t, value: 30 }))) }
        rsiChart.timeScale().setVisibleRange(chart.timeScale().getVisibleRange() || { from: 0, to: 100 })
        chart.timeScale().subscribeVisibleTimeRangeChange(range=>{ if(range && rsiChart) rsiChart.timeScale().setVisibleRange(range) })
      }
      if(indicators.macd && macdRef.current && data.some(d=>d.macd)){
        macdChart = createChart(macdRef.current, {
          width: w, height: 90,
          layout: { background: { color: '#111827' }, textColor: '#6B7280' },
          grid: { vertLines: { color: 'rgba(55,65,81,0.2)' }, horzLines: { color: 'rgba(55,65,81,0.2)' } },
          timeScale: { visible: true, borderColor: '#374151' },
          rightPriceScale: { borderColor: '#374151' },
        })
        const macdLine = macdChart.addLineSeries({ color: '#3B82F6', lineWidth: 1.5 })
        const signalLine = macdChart.addLineSeries({ color: '#F59E0B', lineWidth: 1 })
        const histSeries = macdChart.addHistogramSeries({ priceFormat: { type: 'price' } })
        macdLine.setData(data.filter(d=>d.macd!=null).map(d=>({ time: Math.floor(new Date(d.date).getTime()/1000), value: d.macd })))
        signalLine.setData(data.filter(d=>d.signal!=null).map(d=>({ time: Math.floor(new Date(d.date).getTime()/1000), value: d.signal })))
        histSeries.setData(data.filter(d=>d.macd!=null && d.signal!=null).map(d=>({ time: Math.floor(new Date(d.date).getTime()/1000), value: d.macd - d.signal, color: (d.macd - d.signal) >=0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)' })))
        macdChart.timeScale().setVisibleRange(chart.timeScale().getVisibleRange() || { from: 0, to: 100 })
        chart.timeScale().subscribeVisibleTimeRangeChange(range=>{ if(range && macdChart) macdChart.timeScale().setVisibleRange(range) })
      } else { chart.timeScale().fitContent() }
      if(!indicators.macd) chart.timeScale().fitContent()
      ro = new ResizeObserver(()=>{ if(!ref.current || !chart) return; const nw = ref.current.clientWidth; chart.applyOptions({ width: nw }); if(volumeChart) volumeChart.applyOptions({ width: nw }); if(rsiChart) rsiChart.applyOptions({ width: nw }); if(macdChart) macdChart.applyOptions({ width: nw }) })
      ro.observe(ref.current)
    }
    init()
    return ()=> { if(timeout) clearTimeout(timeout); if(ro) ro.disconnect(); if(chart) chart.remove(); if(volumeChart) volumeChart.remove(); if(rsiChart) rsiChart.remove(); if(macdChart) macdChart.remove() }
  }, [data, indicators, height, compact, chartType])

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-1.5 mb-2 p-1 glass-card rounded-xl w-fit items-center">
        <span className="text-xs text-gray-500 self-center px-1 font-mono">Type:</span>
        <button onClick={()=>setChartType('candle')} className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${chartType==='candle' ? 'bg-[#2962FF] border-[#2962FF] text-white shadow-md' : 'glass-card border-gray-700 text-gray-400 hover:text-white'}`}>🕯️ Candle</button>
        <button onClick={()=>setChartType('line')} className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${chartType==='line' ? 'bg-[#2962FF] border-[#2962FF] text-white shadow-md' : 'glass-card border-gray-700 text-gray-400 hover:text-white'}`}>📈 Line</button>
        <span className="w-px h-4 bg-gray-700 mx-1 hidden md:inline" />
        <span className="text-xs text-gray-500 self-center px-1 font-mono">Indicators:</span>
        {[
          {k:'sma', label:'SMA 20/50'},
          {k:'bb', label:'BB'},
          {k:'volume', label:'Vol'},
          {k:'rsi', label:'RSI'},
          {k:'macd', label:'MACD'},
        ].map(btn=>(
          <button key={btn.k} onClick={()=>setIndicators(s=>({...s, [btn.k]: !s[btn.k]}))} className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${indicators[btn.k] ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'glass-card border-gray-700 text-gray-400 hover:text-white'}`}>
            {btn.label}
          </button>
        ))}
        <span className="text-xs text-gray-600 self-center ml-1 hidden md:inline">• TradingView-style</span>
      </div>
      <div ref={ref} className="w-full rounded-xl overflow-hidden border border-gray-800" />
      {indicators.volume && <div ref={volumeRef} className="w-full mt-1 rounded-xl overflow-hidden border border-gray-800" />}
      {indicators.rsi && <div ref={rsiRef} className="w-full mt-1 rounded-xl overflow-hidden border border-gray-800" />}
      {indicators.macd && <div ref={macdRef} className="w-full mt-1 rounded-xl overflow-hidden border border-gray-800" />}
      <p className="text-xs text-gray-600 mt-1">{chartType==='candle' ? 'Candles' : 'Line (close)'} + SMA/BB on main • Volume/RSI/MACD in panes • Sync scroll • Switch Candle/Line above</p>
    </div>
  )
}
