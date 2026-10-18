import axios from 'axios';
import NodeCache from 'node-cache';
import { NSE_UNIVERSE } from '../data/nseUniverse.js';

const cache = new NodeCache({ stdTTL: 3 }); // 3 sec for real-time feel
const histCache = new NodeCache({ stdTTL: 60 });

// Yahoo removed these symbols (demerger/delisted) — redirect to current ones
const SYMBOL_ALIASES = {
  'TATAMOTORS': 'TMCV',
  'TATAMOTORS.NS': 'TMCV.NS',
  'TATAMOTORS.BO': 'TMCV.BO',
  'LTIM': 'LT',
  'LTIM.NS': 'LT.NS',
  'LTIM.BO': 'LT.BO',
  'LTIMINDTREE': 'LT',
  'LTIMINDTREE.NS': 'LT.NS',
};

const normalize = (s) => {
  if (!s) return s;
  if (s.startsWith('^')) return s;
  const upper = s.toUpperCase();
  if (SYMBOL_ALIASES[upper]) return SYMBOL_ALIASES[upper];
  if (upper.includes('.')) return upper;
  return `${upper}.NS`;
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
  let data = null;
  try {
    data = await fetchChart(sym, '1m', '1d');
    if (!data?.meta) throw new Error('no meta');
  } catch (e) {
    const status = e.response?.status;
    if ((status === 404 || e.message.includes('404')) && sym.endsWith('.NS')) {
      const boSym = sym.replace('.NS', '.BO');
      try {
        console.warn(`realtime ${sym} 404 — retrying ${boSym}`);
        data = await fetchChart(boSym, '1m', '1d');
      } catch {
        throw e;
      }
    }
    if (!data?.meta) throw e;
  }
  const m = data.meta;
  let regularMarketOpen = m.regularMarketPrice;
  try {
    const opens = data.indicators?.quote?.[0]?.open;
    if (opens) {
      const firstValid = opens.find(v => v != null && v > 0);
      if (firstValid) regularMarketOpen = firstValid;
    }
  } catch {}
  const quote = {
    symbol: m.symbol,
    shortName: sym.replace('.NS','').replace('.BO',''),
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
    _chart: data
  };
  cache.set(key, quote);
  return quote;
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
  const rangeMap = {'1d':'1d','5d':'5d','1mo':'1mo','3mo':'3mo','6mo':'6mo','1y':'1y','5y':'5y'};
  const range = rangeMap[period]||'3mo';
  let data = null;
  try {
    data = await fetchChart(sym, interval, range);
    if(!data?.timestamp || !data?.indicators?.quote?.[0]) throw new Error('no history');
  } catch(e) {
    const status = e.response?.status;
    if((status === 404 || e.message.includes('404')) && sym.endsWith('.NS')){
      const boSym = sym.replace('.NS','.BO');
      try {
        console.warn(`history ${sym} 404 — retrying ${boSym}`);
        data = await fetchChart(boSym, interval, range);
      } catch { throw e; }
    }
    if(!data?.timestamp || !data?.indicators?.quote?.[0]) throw e;
  }
  const ts = data.timestamp;
  const q = data.indicators.quote[0];
  const out = ts.map((t,i)=>({
    date: new Date(t*1000),
    open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], volume: q.volume[i]
  })).filter(d=>d.close!=null);
  histCache.set(key, out);
  return out;
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
