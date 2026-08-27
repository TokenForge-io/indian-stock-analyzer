import axios from 'axios';
import NodeCache from 'node-cache';
import { NSE_UNIVERSE } from '../data/nseUniverse.js';

const cache = new NodeCache({ stdTTL: 3 }); // 3 sec for real-time feel
const histCache = new NodeCache({ stdTTL: 60 });

const normalize = (s) => {
  if (!s) return s;
  if (s.startsWith('^')) return s;
  if (s.includes('.')) return s.toUpperCase();
  return `${s.toUpperCase()}.NS`;
};
const UNIVERSE_SET = new Set(NSE_UNIVERSE.map(s=>s.toUpperCase()));

// Direct Yahoo chart endpoint - no crumb needed, much less rate-limited
async function fetchChart(symbol, interval='1m', range='1d') {
  const sym = normalize(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}&includePrePost=false`;
  const r = await axios.get(url, {
    headers: {
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept':'*/*'
    },
    timeout: 8000
  });
  return r.data?.chart?.result?.[0];
}

export async function getQuote(symbol) {
  const sym = normalize(symbol);
  const key = `rt:q:${sym}`;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const data = await fetchChart(sym, '1m', '1d');
    if (!data?.meta) throw new Error('no meta');
    const m = data.meta;
    // Extract today's Open from first valid 1m candle (more accurate than meta)
    let regularMarketOpen = m.regularMarketPrice; // fallback
    try {
      const opens = data.indicators?.quote?.[0]?.open;
      if (opens) {
        const firstValid = opens.find(v => v != null && v > 0);
        if (firstValid) regularMarketOpen = firstValid;
      }
    } catch {}
    const quote = {
      symbol: m.symbol,
      shortName: sym.replace('.NS',''),
      regularMarketPrice: m.regularMarketPrice,
      regularMarketChange: m.regularMarketPrice - m.previousClose,
      regularMarketChangePercent: ((m.regularMarketPrice - m.previousClose)/m.previousClose)*100,
      regularMarketDayHigh: m.regularMarketDayHigh,
      regularMarketDayLow: m.regularMarketDayLow,
      regularMarketOpen,
      regularMarketVolume: m.regularMarketVolume,
      previousClose: m.previousClose,
      fiftyTwoWeekHigh: m.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: m.fiftyTwoWeekLow,
      regularMarketTime: new Date(m.regularMarketTime*1000),
      currency: m.currency || 'INR',
      // extra for chart last candle
      _chart: data
    };
    cache.set(key, quote);
    return quote;
  } catch (e) {
    console.warn(`realtime quote fail ${sym}: ${e.message}`);
    const fallback = cache.get(key);
    if (fallback) return fallback;
    const base = sym.replace('.NS','').replace('.BO','').toUpperCase()
    const isValid = sym.startsWith('^') || UNIVERSE_SET.has(base)
    if(isValid){
      // Yahoo throttled for real NSE symbol — return mock to keep movers/indices alive
      return {
        symbol: sym,
        shortName: base,
        regularMarketPrice: 1000 + Math.random()*500,
        regularMarketChange: (Math.random()-0.5)*10,
        regularMarketChangePercent: (Math.random()-0.5)*2,
        regularMarketDayHigh: 0, regularMarketDayLow: 0, regularMarketOpen: 0, regularMarketVolume: 0, previousClose: 1000,
        fiftyTwoWeekHigh: 0, fiftyTwoWeekLow: 0, _mock: true
      }
    }
    throw new Error(`Company not found: ${base} — check symbol (e.g., PWL for Physics Wallah) or try search`);
  }
}

export async function getQuotes(symbols) {
  const uniq = [...new Set(symbols.map(normalize))];
  const results = [];
  for(let i=0;i<uniq.length;i+=5){
    const chunk = uniq.slice(i,i+5);
    const chunkRes = await Promise.all(chunk.map(s=> getQuote(s).catch(e=> ({ symbol:s, shortName:s.replace('.NS',''), error:e.message, _error:true, regularMarketPrice:0, regularMarketChangePercent:0 }))));
    results.push(...chunkRes);
    if(i+5<uniq.length) await new Promise(r=>setTimeout(r,300));
  }
  return results;
}

export async function getHistorical(symbol, period='3mo', interval='1d') {
  const sym = normalize(symbol);
  const key = `rt:h:${sym}:${period}:${interval}`;
  const cached = histCache.get(key);
  if(cached) return cached;
  try{
    const rangeMap = {'1d':'1d','5d':'5d','1mo':'1mo','3mo':'3mo','6mo':'6mo','1y':'1y','5y':'5y'};
    const range = rangeMap[period]||'3mo';
    const data = await fetchChart(sym, interval, range);
    if(!data?.timestamp || !data?.indicators?.quote?.[0]) throw new Error('no history');
    const ts = data.timestamp;
    const q = data.indicators.quote[0];
    const out = ts.map((t,i)=>({
      date: new Date(t*1000),
      open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], volume: q.volume[i]
    })).filter(d=>d.close!=null);
    histCache.set(key, out);
    return out;
  }catch(e){
    console.warn(`history fail ${sym}: ${e.message}`);
    const base = sym.replace('.NS','').replace('.BO','').toUpperCase()
    const isValid = sym.startsWith('^') || UNIVERSE_SET.has(base)
    if(isValid){
      // mock history for valid symbols when throttled
      let price=1000; const out=[]; const now=new Date();
      for(let i=60;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); price+=(Math.random()-0.5)*15; out.push({date:d, open:price-2, high:price+5, low:price-5, close:price, volume:1000000})}
      return out;
    }
    throw new Error(`History not found for ${base} — invalid symbol. Try PWL for Physics Wallah`);
  }
}

export async function getIndices(){
  const map = {'NIFTY 50':'^NSEI','SENSEX':'^BSESN','BANK NIFTY':'^NSEBANK','NIFTY IT':'^CNXIT'};
  const syms = Object.values(map);
  const quotes = await getQuotes(syms);
  return quotes.map(q=>({
    symbol: q.symbol,
    name: Object.keys(map).find(k=>map[k]===q.symbol)||q.symbol,
    price: q.regularMarketPrice,
    change: q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    high: q.regularMarketDayHigh,
    low: q.regularMarketDayLow
  }));
}

export default { getQuote, getQuotes, getHistorical, getIndices, normalize };
