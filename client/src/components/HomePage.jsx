import IndicesBar from './IndicesBar.jsx'
import Newsletter from './Newsletter.jsx'
export default function HomePage({ onEnter, onPicks }){
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 overflow-hidden relative">
      {/* Matrix currency rain — interactive, visible */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.22] pointer-events-none">
        <style>{`@keyframes fall{0%{transform:translateY(-100vh)}100%{transform:translateY(120vh)}} @keyframes flicker{0%,100%{filter:brightness(1)}50%{filter:brightness(1.5)}}`}</style>
        {Array.from({length: 28}).map((_,i)=>(
          <span key={i} className="absolute top-0 font-mono text-[13px] font-bold tracking-widest select-none pointer-events-auto cursor-crosshair hover:scale-[1.8] hover:z-20 hover:brightness-[1.8] hover:drop-shadow-[0_0_12px_currentColor] transition-all duration-300" style={{
            left: `${(i*3.55)+0.8}%`,
            animation: `fall ${6 + (i%3)*1.6}s linear infinite`,
            animationDelay: `${(i%5)*0.45}s`,
            color: i%4===0 ? '#60a5fa' : i%4===1 ? '#34d399' : i%4===2 ? '#fbbf24' : '#a78bfa',
            textShadow: '0 0 8px currentColor',
          }} onMouseEnter={e=>{
            const el=e.currentTarget
            el.style.transform=`translate(${(Math.random()-0.5)*18}px, -6px) scale(1.8) rotate(${(Math.random()-0.5)*6}deg)`
            setTimeout(()=>{ el.style.transform='' }, 550)
          }}>
            <span style={{display:'block', animation: `flicker 0.5s steps(2) infinite`, animationDelay: `${i*0.11}s`}}>
              {[ '₹',' ₹ ',' $ ',' $ ',' € ',' ¥ ',' ₿ ',' RELIANCE ',' TCS ',' INFY ',' ₹ ',' GOLDBEES ',' MTARTECH ',' NIFTY '][i%14]}
            </span>
            <span style={{display:'block', marginTop: '28px', opacity:0.85}}>{['₹','¥',' $ ','₿','€','₹','¥'][i%7]}</span>
            <span style={{display:'block', marginTop: '28px', opacity:0.55}}>{['RELIANCE','HDFCBANK','TCS','GOLDBEES','MTARTECH'][i%5]}</span>
          </span>
        ))}
      </div>
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-gray-950/70 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center font-black">◈</div>
            <div>
              <p className="ai-premium font-black tracking-tight leading-none">Indian Stock Analyzer</p>
              <p className="text-[10px] text-gray-500 tracking-widest uppercase">NSE • BSE • Real-time</p>
            </div>
          </div>
          <button onClick={onEnter} className="hidden md:inline-flex px-5 py-2.5 tv-gradient rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition">Access Analyzer →</button>
          <button onClick={onEnter} className="md:hidden px-4 py-2 bg-white text-gray-900 rounded-xl text-sm font-bold">Open</button>
        </div>
      </nav>
      <IndicesBar />

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-violet-900/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[700px] h-[700px] bg-violet-600/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-16 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 glass-card rounded-full text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-300">Live • Yahoo Finance • Screener.in • 3s updates</span>
            <span className="hidden md:inline text-gray-600">•</span>
            <span className="hidden md:inline text-blue-400 font-semibold">2,000 stocks scanned by AI</span>
          </div>

          <h1 className="ai-premium text-4xl md:text-6xl font-black tracking-tight mt-5 leading-[0.95] cursor-default transition-all duration-500 hover:drop-shadow-[0_0_18px_rgba(96,165,250,0.9)] hover:brightness-110">
            <span className="inline-block transition-all duration-500 hover:drop-shadow-[0_0_12px_rgba(96,165,250,0.8)] hover:text-white">Premium</span> <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent inline-block transition-all duration-500 hover:drop-shadow-[0_0_16px_rgba(139,92,246,0.9)] hover:brightness-125">AI Stock</span> <span className="inline-block transition-all duration-500 hover:drop-shadow-[0_0_12px_rgba(96,165,250,0.8)] hover:text-white">Analyzer</span>
            <br /><span className="inline-block transition-all duration-500 hover:drop-shadow-[0_0_10px_rgba(96,165,250,0.7)] hover:text-[#60a5fa]">for India</span>
          </h1>
          <p className="ai-body text-gray-400 mt-4 max-w-2xl text-base md:text-lg leading-relaxed">
            Real-time NSE/BSE analysis with TradingView-style charts, AI 100 score with pros/cons & forecasts, Top AI Picks from <span className="text-white font-semibold">2,000 stocks</span>, ratios, targets, news & official NSE/BSE documents — all in one premium glass UI.
          </p>

          <div className="flex flex-wrap gap-3 mt-7">
            <button onClick={onEnter} className="px-7 py-3.5 tv-gradient rounded-2xl font-black text-white shadow-xl hover:shadow-2xl hover:opacity-90 transition flex items-center gap-2">
              <span>Access AI Stock Analyzer</span>
              <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">→</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 text-xs">
            <span className="px-3 py-1.5 glass-card rounded-full">✓ No login</span>
            <span className="px-3 py-1.5 glass-card rounded-full">✓ Real-time 3s</span>
            <span className="px-3 py-1.5 glass-card rounded-full">✓ 2,000 scan</span>
            <span className="px-3 py-1.5 glass-card rounded-full text-gray-500">Not SEBI advice • Education only</span>
          </div>

          {/* Preview mock — TradingView terminal */}
          <div className="mt-8 grid grid-cols-12 gap-4 font-sans">
            <div className="col-span-12 lg:col-span-8 bg-[#0f141a] border border-[#2a2e39] rounded-[8px] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-[#1e222d] border-b border-[#2a2e39]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-[#2962FF] rounded-full" />
                  <p className="font-bold text-[13px] tracking-tight text-white">RELIANCE <span className="text-[#5d606b] font-normal">•</span> <span className="font-mono font-medium text-[#089981]">₹1,298.00</span> <span className="font-mono text-[11px] text-[#787b86]">-1.44% • LTP</span></p>
                  <span className="hidden md:inline-flex text-[10px] leading-none px-2 py-1 rounded bg-[#131722] border border-[#2a2e39] text-[#787b86] font-mono">NSE</span>
                  <span className="hidden md:inline-flex text-[10px] px-1.5 py-1 rounded bg-[#2962FF] text-white font-bold tracking-widest">1D</span>
                </div>
                <span className="font-mono text-[11px] px-2 py-1 rounded bg-[#089981]/15 text-[#089981] border border-[#089981]/25 font-bold tracking-widest">BUY • 72/100</span>
              </div>
              <div className="h-36 bg-[#131722] overflow-hidden relative">
                <svg viewBox="0 0 640 140" className="w-full h-full">
                  <defs>
                    <linearGradient id="gUp2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#089981" stopOpacity="0.28"/><stop offset="100%" stopColor="#089981" stopOpacity="0"/></linearGradient>
                  </defs>
                  <g stroke="#1e222d" strokeWidth="0.7">
                    <line x1="0" y1="28" x2="640" y2="28"/><line x1="0" y1="56" x2="640" y2="56"/><line x1="0" y1="84" x2="640" y2="84"/><line x1="0" y1="112" x2="640" y2="112"/>
                    <line x1="80" y1="0" x2="80" y2="140"/><line x1="160" y1="0" x2="160" y2="140"/><line x1="240" y1="0" x2="240" y2="140"/><line x1="320" y1="0" x2="320" y2="140"/><line x1="400" y1="0" x2="400" y2="140"/><line x1="480" y1="0" x2="480" y2="140"/><line x1="560" y1="0" x2="560" y2="140"/>
                  </g>
                  <path d="M0,78 L40,72 L80,85 L120,60 L160,68 L200,52 L240,58 L280,48 L320,62 L360,54 L400,44 L440,50 L480,38 L520,46 L560,34 L600,42 L640,36 L640,96 L0,96 Z" fill="url(#gUp2)" />
                  <path d="M0,78 L40,72 L80,85 L120,60 L160,68 L200,52 L240,58 L280,48 L320,62 L360,54 L400,44 L440,50 L480,38 L520,46 L560,34 L600,42 L640,36" fill="none" stroke="#089981" strokeWidth="1.8" />
                  <path d="M0,82 L40,80 L80,84 L120,70 L160,72 L200,62 L240,64 L280,58 L320,64 L360,60 L400,54 L440,56 L480,48 L520,52 L560,44 L600,48 L640,46" fill="none" stroke="#2962FF" strokeWidth="1.2" />
                  <path d="M0,88 L80,86 L160,78 L240,72 L320,68 L400,62 L480,58 L560,54 L640,52" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.9" />
                  <g>
                    <rect x="18" y="70" width="10" height="14" fill="#089981" /><line x1="23" y1="64" x2="23" y2="90" stroke="#089981" strokeWidth="1" />
                    <rect x="58" y="64" width="10" height="18" fill="#F23645" /><line x1="63" y1="58" x2="63" y2="88" stroke="#F23645" strokeWidth="1" />
                    <rect x="98" y="76" width="10" height="12" fill="#089981" /><line x1="103" y1="70" x2="103" y2="94" stroke="#089981" strokeWidth="1" />
                    <rect x="138" y="52" width="10" height="20" fill="#089981" /><line x1="143" y1="46" x2="143" y2="78" stroke="#089981" strokeWidth="1" />
                    <rect x="218" y="46" width="10" height="16" fill="#089981" /><line x1="223" y1="40" x2="223" y2="68" stroke="#089981" strokeWidth="1" />
                    <rect x="298" y="42" width="10" height="14" fill="#089981" /><line x1="303" y1="36" x2="303" y2="62" stroke="#089981" strokeWidth="1" />
                    <rect x="418" y="38" width="10" height="16" fill="#089981" /><line x1="423" y1="32" x2="423" y2="60" stroke="#089981" strokeWidth="1" />
                    <rect x="498" y="32" width="10" height="14" fill="#089981" /><line x1="503" y1="26" x2="503" y2="52" stroke="#089981" strokeWidth="1" />
                    <rect x="618" y="30" width="10" height="12" fill="#089981" /><line x1="623" y1="24" x2="623" y2="48" stroke="#089981" strokeWidth="1" />
                  </g>
                </svg>
                <div className="absolute top-1.5 left-2 flex gap-1">
                  <span className="text-[10px] leading-none px-1.5 py-1 rounded-[3px] bg-[#2962FF] text-white font-bold font-mono tracking-widest">SMA 20/50</span>
                  <span className="text-[10px] leading-none px-1.5 py-1 rounded-[3px] bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc] font-mono">BB</span>
                  <span className="text-[10px] leading-none px-1.5 py-1 rounded-[3px] bg-[#2962FF] text-white font-bold font-mono">VOL</span>
                  <span className="text-[10px] leading-none px-1.5 py-1 rounded-[3px] bg-[#2962FF] text-white font-bold font-mono">RSI 52.5</span>
                  <span className="text-[10px] leading-none px-1.5 py-1 rounded-[3px] bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc] font-mono">MACD</span>
                </div>
                <div className="absolute bottom-1 right-1 text-[9px] leading-none px-1.5 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-[#787b86] font-mono tracking-widest">TradingView • Lightweight Charts • 3s</div>
              </div>
              <div className="grid grid-cols-3 bg-[#1e222d] border-t border-[#2a2e39] divide-x divide-[#2a2e39]">
                {[
                  {k:'Open',v:'1,305.00'},{k:'High',v:'1,318.50'},{k:'Low',v:'1,292.00'},
                  {k:'Mkt Cap',v:'18.5T'},{k:'P/E',v:'28.4'},{k:'Volume',v:'5.24M'},
                  {k:'Prev Close',v:'1,311.00'},{k:'52W High',v:'1,645.00'},{k:'52W Low',v:'1,145.00'},
                ].map(x=> <div key={x.k} className="px-2.5 py-2"><p className="text-[9px] leading-none text-[#787b86] uppercase tracking-widest font-mono">{x.k}</p><p className="font-mono text-[12px] font-medium text-[#d1d4dc] mt-1">{x.v}</p></div>)}
              </div>
              <div className="flex flex-wrap gap-1 px-2 py-2 bg-[#131722] border-t border-[#2a2e39]">
                {['AI 100','News','Target','Ratios','Documents'].map(t=> <span key={t} className="text-[10px] leading-none px-2 py-1 rounded-[3px] bg-[#2962FF] text-white font-bold tracking-widest">{t}</span>)}
                <span className="text-[10px] leading-none px-2 py-1 rounded-[3px] bg-[#1e222d] border border-[#2a2e39] text-[#787b86] font-mono">EMA • VWAP • Stoch • CCI • ATR • OBV</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#2a2e39] bg-[#1e222d] border-t border-[#2a2e39]">
                <div className="px-2.5 py-2"><p className="text-[9px] leading-none text-[#787b86] uppercase tracking-widest font-mono">AI Score</p><p className="font-mono text-xs font-bold text-[#089981] mt-1">72 /100 • BUY</p><p className="text-[10px] leading-none text-[#5d606b] font-mono mt-1">Pros • Cons • 3M/6M/12M</p></div>
                <div className="px-2.5 py-2"><p className="text-[9px] leading-none text-[#787b86] uppercase tracking-widest font-mono">Watchlist • Screener</p><p className="font-mono text-xs font-medium text-[#d1d4dc]">RELIANCE • TCS • INFY</p><p className="text-[10px] leading-none text-[#5d606b] font-mono mt-1">Compare 4 • Live</p></div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-3">
              <div className="glass-card rounded-2xl p-4">
                <p className="ai-premium font-bold text-sm flex justify-between">🔥 Top Movers <span className="text-xs text-gray-500">Today • NIFTY 50</span></p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <p className="text-[10px] font-bold text-green-400 tracking-wide uppercase mb-1">Top 5 Gainers</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between glass-card rounded-lg px-2 py-1"><span>KOTAKBANK</span><span className="text-green-400">+3.76%</span></div>
                      <div className="flex justify-between glass-card rounded-lg px-2 py-1"><span>DIVISLAB</span><span className="text-green-400">+3.21%</span></div>
                      <div className="flex justify-between glass-card rounded-lg px-2 py-1"><span>SHREECEM</span><span className="text-green-400">+1.74%</span></div>
                      <div className="flex justify-between glass-card rounded-lg px-2 py-1"><span>AXISBANK</span><span className="text-green-400">+1.62%</span></div>
                      <div className="flex justify-between glass-card rounded-lg px-2 py-1"><span>JSWSTEEL</span><span className="text-green-400">+1.57%</span></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-red-400 tracking-wide uppercase mb-1">Top 5 Losers</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between glass-card rounded-lg px-2 py-1"><span>BHARTIARTL</span><span className="text-red-400">-2.31%</span></div>
                      <div className="flex justify-between glass-card rounded-lg px-2 py-1"><span>POWERGRID</span><span className="text-red-400">-2.14%</span></div>
                      <div className="flex justify-between glass-card rounded-lg px-2 py-1"><span>INFY</span><span className="text-red-400">-2.10%</span></div>
                      <div className="flex justify-between glass-card rounded-lg px-2 py-1"><span>LT</span><span className="text-red-400">-1.96%</span></div>
                      <div className="flex justify-between glass-card rounded-lg px-2 py-1"><span>NESTLEIND</span><span className="text-red-400">-1.86%</span></div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-600 mt-2">Same as analyzer: 5 Gainers / 5 Losers • Live • Click to analyze</p>
              </div>
              <div className="glass-card rounded-2xl p-4 hover:border-blue-500/30 cursor-pointer" onClick={onPicks || onEnter}>
                <p className="ai-premium font-bold text-sm">🤖 Top AI Picks • 30 stocks</p>
                <p className="text-xs text-gray-500 mt-1">10 Steady • 10 Mid • 10 Aggressive • Scanned from 2,000</p>
                <button onClick={(e)=>{e.stopPropagation(); (onPicks||onEnter)?.()}} className="mt-2 w-full py-2 tv-gradient rounded-xl text-xs font-bold">Check Top AI Picks →</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — terminal */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-baseline gap-3">
          <span className="h-5 w-1 bg-[#2962FF] rounded-full" />
          <h2 className="font-sans text-[22px] font-bold tracking-tight text-white">Everything for informed decisions</h2>
          <span className="hidden md:inline text-[10px] tracking-[0.18em] uppercase font-mono text-[#787b86] border border-[#2a2e39] rounded-full px-2.5 py-1 bg-[#1e222d]">Terminal • No clutter • 0-finance → Pro</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {[
            { t:'Real-time NSE/BSE', d:'Yahoo direct chart • Socket.io 3s • 1Y/3M history • SMA 20/50/200, RSI, MACD, Bollinger', n:'01' },
            { t:'AI Score 100', d:'Tech 30 + Fundamental 30 + Momentum 20 + News 10 + Target 10 • Pros/Cons • 3M/6M/12M forecast', n:'02' },
            { t:'Top AI Picks — 2,000 scan', d:'2-phase: quick filter 2000 → deep Top 120 → Top 30 (10 Steady/Mid/Aggressive) + progress', n:'03' },
            { t:'Charts & Indicators', d:'Lightweight TradingView • SMA/BB/Vol/RSI/MACD + More (EMA/VWAP/Stoch/CCI/ATR/OBV)', n:'04' },
            { t:'Ratios & KPI', d:'TradingView KPI — Open/High/Low/Mkt Cap/P/E/Volume/Prev Close/52W • Ratios P/E, ROE, ROCE, Div, BV', n:'05' },
            { t:'Targets & News', d:'Broker consensus target (reputed) + 52W range • Google News RSS 8 headlines • 10 min', n:'06' },
            { t:'Documents — Official', d:'NSE per-symbol — Annual Reports, Quarterly Results, Announcements, Board Meetings, Shareholding + BSE', n:'07' },
            { t:'Movers • Compare • Watchlist', d:'Top Movers Today/Week/Month by index • Compare 4 • Watchlist live prices', n:'08' },
            { t:'Company Info', d:'Wikipedia • Screener • TradingView • NSE/BSE • MoneyControl • Official site — About & links', n:'09' },
          ].map(f=>(
            <div key={f.t} className="bg-[#0f141a] border border-[#2a2e39] rounded-[8px] p-4 hover:border-[#2962FF]/30 transition group">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest text-[#787b86] border border-[#2a2e39] rounded-[4px] px-1.5 py-0.5 bg-[#1e222d]">{f.n}</span>
                <span className="h-1 w-8 bg-[#2962FF]/60 rounded-full group-hover:w-12 transition-all" />
              </div>
              <p className="font-sans font-semibold text-[13px] tracking-tight text-[#d1d4dc] mt-3">{f.t}</p>
              <p className="font-mono text-[11px] leading-relaxed text-[#787b86] mt-1">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — terminal */}
      <section className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-[#0f141a] border border-[#2a2e39] rounded-[8px] p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="h-5 w-1 bg-[#2962FF] rounded-full" />
              <p className="font-sans text-[15px] font-bold tracking-tight text-white">How it works</p>
              <span className="font-mono text-[10px] tracking-widest uppercase text-[#787b86] border border-[#2a2e39] rounded-full px-2 py-1 bg-[#1e222d]">3 steps</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              {[
                {n:'01', t:'Search', d:'Type RELIANCE / GOLDBEES / MTARTECH — autocomplete + Enter'},
                {n:'02', t:'Analyze', d:'Chart + KPI + Technical View (simple) + AI 100 + News / Targets / Ratios / Documents'},
                {n:'03', t:'Act', d:'Watchlist • Compare 4 • Top AI Picks from 2000 • Not SEBI advice'},
              ].map(s=>(
                <div key={s.n} className="bg-[#1e222d] border border-[#2a2e39] rounded-[8px] p-3 hover:border-[#2962FF]/30 transition">
                  <span className="font-mono text-[10px] tracking-widest text-[#787b86] border border-[#2a2e39] rounded-[4px] px-1.5 py-0.5 bg-[#0f141a]">{s.n}</span>
                  <p className="font-sans font-semibold text-[13px] tracking-tight text-[#d1d4dc] mt-2">{s.t}</p>
                  <p className="font-mono text-[11px] leading-relaxed text-[#787b86] mt-1">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onEnter} className="px-8 py-4 bg-[#2962FF] hover:bg-[#1e4bd8] rounded-[8px] font-bold text-white shadow-lg whitespace-nowrap tracking-tight">Open AI Stock Analyzer →</button>
        </div>
      </section>

      {/* Data sources */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <p className="text-xs tracking-widest uppercase text-gray-500">Trusted sources • No guessing</p>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          {['Yahoo Finance (price)', 'Screener.in (fundamentals)', 'NSE India (filings)', 'BSE India (filings)', 'Google News (RSS)', 'Broker consensus (targets)', 'Wikipedia (info)', 'TradingView (charts)'].map(s=> <span key={s} className="px-3 py-1.5 glass-card rounded-full">{s}</span>)}
        </div>
      </section>

      {/* Newsletter — daily 7 PM */}
      <section className="max-w-7xl mx-auto px-4 pb-4">
        <Newsletter />
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <div className="tv-gradient rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="ai-premium text-xl font-black text-white">Ready to analyze?</p>
            <p className="text-sm text-white/80 mt-1">Open the analyzer — live, free, no login. 2,000 stocks ready.</p>
          </div>
          <button onClick={onEnter} className="px-8 py-3.5 bg-white text-gray-900 rounded-xl font-black shadow-lg">Access AI Stock Analyzer →</button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-4">Made by <span className="text-blue-400 font-bold">Saurabh</span> • Not SEBI registered • Education only • Data ~1-5min delayed</p>
      </section>
    </div>
  )
}
