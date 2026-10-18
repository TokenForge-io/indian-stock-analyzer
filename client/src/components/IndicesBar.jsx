import { useEffect, useState } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
const socket = import.meta.env.VITE_API_URL ? io(import.meta.env.VITE_API_URL) : io()

export default function IndicesBar(){
  const [indices, setIndices] = useState([])
  useEffect(()=>{
    axios.get('/api/indices').then(r=>setIndices(r.data)).catch(()=>{})
    socket.on('indices', setIndices)
    return ()=> socket.off('indices')
  },[])
  const loop = indices.length ? [...indices, ...indices] : []
  return (
    <div className="glass-topbar backdrop-blur-xl overflow-hidden">
      <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <div className="relative max-w-7xl mx-auto">
        <div className="flex gap-8 px-4 py-2.5 text-sm whitespace-nowrap" style={{animation: loop.length ? 'marquee 60s linear infinite' : 'none', width: 'max-content'}} onMouseEnter={e=>e.currentTarget.style.animationPlayState='paused'} onMouseLeave={e=>e.currentTarget.style.animationPlayState='running'}>
          {(loop.length ? loop : [{symbol:'loading',name:'Loading indices...',price:0,change:0,changePercent:0}]).map((idx,i)=>(
            <div key={`${idx.symbol}-${i}`} className="flex gap-2 items-center hover-premium px-2 py-1 rounded-lg shrink-0">
              <span className="ai-premium font-bold">{idx.name}</span>
              <span className="font-mono font-medium">{idx.price?.toFixed ? idx.price.toFixed(2) : idx.price}</span>
              {idx.symbol!=='loading' && <span className={`font-mono text-xs px-1.5 py-0.5 rounded-full ${idx.change>=0?'bg-green-500/10 text-green-400 border border-green-500/20':'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{idx.change>=0?'+':''}{idx.change?.toFixed(2)} ({idx.changePercent?.toFixed(2)}%)</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
