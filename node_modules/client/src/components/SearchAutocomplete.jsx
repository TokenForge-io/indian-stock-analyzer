import { useState, useEffect, useRef } from 'react'
import { INDIAN_STOCKS } from '../data/indianStocks.js'

function filterStocks(query){
  if(!query || query.trim().length < 1) return []
  const q = query.trim().toLowerCase().replace(/\s+/g,'')
  const qWords = query.trim().toLowerCase().split(/\s+/)
  // Score: exact symbol start, name contains all words, symbol contains
  const scored = INDIAN_STOCKS.map(s=>{
    const sym = s.symbol.toLowerCase().replace(/-/g,'')
    const name = s.name.toLowerCase()
    let score = -1
    if(sym === q) score = 100
    else if(sym.startsWith(q)) score = 90
    else if(sym.includes(q)) score = 70
    else if(qWords.every(w=> name.includes(w))) score = 80
    else if(name.includes(qWords[0])) score = 60
    else if(name.replace(/\s+/g,'').includes(q)) score = 50
    return score >=0 ? { ...s, score } : null
  }).filter(Boolean).sort((a,b)=>b.score-a.score)
  return scored.slice(0,8)
}

export default function SearchAutocomplete({ value, onChange, onSelect, placeholder="Search: RELIANCE, TCS, Tata Motors", onEnter }){
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const ref = useRef(null)

  useEffect(()=> setQuery(value || ''), [value])
  useEffect(()=>{
    const s = filterStocks(query)
    setSuggestions(s)
    setHighlight(0)
    if(s.length && query) setOpen(true)
    else setOpen(false)
  },[query])

  useEffect(()=>{
    const handleClickOutside = (e)=>{
      if(ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return ()=> document.removeEventListener('mousedown', handleClickOutside)
  },[])

  const handleSelect = (stock)=>{
    setQuery(stock.symbol)
    onChange?.(stock.symbol)
    setOpen(false)
    onSelect?.(stock.symbol)
  }

  const handleKeyDown = (e)=>{
    if(e.key==='ArrowDown'){ e.preventDefault(); setHighlight(h=>(h+1)%suggestions.length) }
    else if(e.key==='ArrowUp'){ e.preventDefault(); setHighlight(h=>(h-1+suggestions.length)%suggestions.length) }
    else if(e.key==='Enter'){
      e.preventDefault()
      if(open && suggestions[highlight]){
        handleSelect(suggestions[highlight])
      } else if(onEnter){
        onEnter(query)
      } else if(query.trim()){
        // Try to find best match or use raw query
        const best = suggestions[0]
        if(best) handleSelect(best)
        else {
          onSelect?.(query.trim().toUpperCase())
          setOpen(false)
        }
      }
    } else if(e.key==='Escape'){ setOpen(false) }
  }

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={e=>{ const v=e.target.value; setQuery(v); onChange?.(v) }}
        onKeyDown={handleKeyDown}
        onFocus={()=>{ if(filterStocks(query).length) setOpen(true) }}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 text-sm focus:outline-none focus:border-blue-600"
        autoComplete="off"
      />
      {open && suggestions.length>0 && (
        <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-auto">
          {suggestions.map((s,i)=>(
            <button
              key={s.symbol}
              type="button"
              onMouseDown={e=>{ e.preventDefault(); handleSelect(s)}}
              className={`w-full text-left px-3 py-2 flex justify-between items-center hover:bg-gray-800 ${i===highlight?'bg-gray-800':''}`}
            >
              <div>
                <p className="text-sm font-semibold">{s.symbol}</p>
                <p className="text-xs text-gray-500">{s.name}</p>
              </div>
              <span className="text-xs text-gray-600">NSE</span>
            </button>
          ))}
          <div className="px-3 py-1 text-xs text-gray-600 border-t border-gray-800">Type & select • Press Enter</div>
        </div>
      )}
    </div>
  )
}
