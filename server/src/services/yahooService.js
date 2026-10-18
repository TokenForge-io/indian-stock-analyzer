import yahooFinance from 'yahoo-finance2';
import NodeCache from 'node-cache';
yahooFinance.suppressNotices(['yahooSurvey', 'ripHistorical']);
const cache = new NodeCache({ stdTTL: 30 }); // 30 sec cache to avoid 429

// Mock generator when Yahoo rate-limits (so UI still works)
function mockQuote(symbol) {
  const base = 500 + (symbol.charCodeAt(0) % 10) * 300 + Math.random()*50;
  const change = (Math.random()-0.5)*10;
  return {
    symbol,
    shortName: symbol.replace('.NS',''),
    regularMarketPrice: base,
    regularMarketChange: change,
    regularMarketChangePercent: (change/base)*100,
    regularMarketDayHigh: base+5,
    regularMarketDayLow: base-5,
    _mock: true
  };
}
function mockHistory(symbol) {
  const now = new Date(); let price = 1000 + Math.random()*500; const out=[];
  for(let i=60;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); const change=(Math.random()-0.5)*20; price+=change;
    out.push({ date:d, open:price-2, high:price+5, low:price-5, close:price, volume: 1000000 }) }
  return out;
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));

// Helper to auto-append .NS if user gives RELIANCE
const normalizeSymbol = (sym) => {
  if (!sym) return sym;
  if (sym.startsWith('^')) return sym; // indices like ^NSEI, ^BSESN
  if (sym.includes('.')) return sym.toUpperCase();
  return `${sym.toUpperCase()}.NS`;
};

// Indices mapping
const INDICES = {
  'NIFTY 50': '^NSEI',
  'SENSEX': '^BSESN',
  'BANK NIFTY': '^NSEBANK',
  'NIFTY IT': '^CNXIT',
  'NIFTY MIDCAP': '^NSMIDCP'
};

async function getQuote(symbol) {
  const sym = normalizeSymbol(symbol);
  const cached = cache.get(`quote:${sym}`);
  if (cached) return cached;
  // retry 3 times for 429, fallback to mock
  for (let attempt=0; attempt<3; attempt++) {
    try {
      const quote = await yahooFinance.quote(sym);
      cache.set(`quote:${sym}`, quote, 30);
      return quote;
    } catch (e) {
      if (e.message.includes('Too Many Requests') && attempt < 2) {
        await sleep(1200*(attempt+1));
        continue;
      }
      console.warn(`getQuote fallback mock for ${sym}: ${e.message}`);
      const mock = mockQuote(sym);
      cache.set(`quote:${sym}`, mock, 15);
      return mock;
    }
  }
}

async function getQuotes(symbols) {
  const normalized = [...new Set(symbols.map(normalizeSymbol))];
  // Check cache first, only fetch uncached
  const toFetch = normalized.filter(s => !cache.get(`quote:${s}`));
  // Fetch in chunks of 4 with delay to avoid 429
  if (toFetch.length > 0) {
    for (let i=0; i<toFetch.length; i+=4) {
      const chunk = toFetch.slice(i, i+4);
      const results = await Promise.allSettled(chunk.map(s => yahooFinance.quote(s).catch(e=>{throw e})));
      results.forEach((r, idx) => {
        const sym = chunk[idx];
        if (r.status === 'fulfilled') cache.set(`quote:${sym}`, r.value);
        else {
          // cache mock on failure to prevent hammering
          const mock = mockQuote(sym);
          cache.set(`quote:${sym}`, mock, 15);
          console.warn(`Yahoo failed for ${sym}: ${r.reason.message} -> using mock`);
        }
      });
      if (i+4 < toFetch.length) await sleep(1200);
    }
  }
  return normalized.map(s => cache.get(`quote:${s}`) || mockQuote(s));
}

async function getHistorical(symbol, period = '1mo', interval = '1d') {
  const sym = normalizeSymbol(symbol);
  const key = `hist:${sym}:${period}:${interval}`;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const result = await yahooFinance.chart(sym, { period1: getPeriodStart(period), interval });
    // chart returns {quotes:[]}
    const data = result.quotes || result;
    cache.set(key, data, 300); // 5 min cache
    return data;
  } catch (e) {
    console.warn(`History fallback mock for ${sym}: ${e.message}`);
    const mock = mockHistory(sym);
    cache.set(key, mock, 60);
    return mock;
  }
}

function getPeriodStart(period) {
  const now = new Date();
  const map = { '1d': 1, '5d': 5, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '5y': 1825 };
  const days = map[period] || 30;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

async function getQuoteSummary(symbol) {
  const sym = normalizeSymbol(symbol);
  const key = `summary:${sym}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const modules = ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData'];
  try {
    const res = await yahooFinance.quoteSummary(sym, { modules });
    cache.set(key, res, 3600); // 1 hour — fundamentals don't change intraday
    return res;
  } catch (e) {
    // Retry once on rate limit
    if (e.message.includes('Too Many Requests') || e.message.includes('429')) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const res = await yahooFinance.quoteSummary(sym, { modules });
        cache.set(key, res, 3600);
        return res;
      } catch { /* fall through */ }
    }
    return null; // caller decides fallback
  }
}

async function search(symbol) {
  try {
    return await yahooFinance.search(symbol, { quotesCount: 10, newsCount: 0 });
  } catch (e) {
    console.warn(`yahoo search throttled for ${symbol}: ${e.message} -> local fallback`);
    if (e.message.includes('Too Many Requests') || e.message.includes('404')) {
      try {
        const { NSE_UNIVERSE } = await import('../data/nseUniverse.js');
        const q = symbol.toUpperCase().trim();
        // alias: TATAMOTORS -> TMCV/TMPV (demerged), LTIM -> LT
        const ALIASES = { 'TATAMOTORS':['TMCV','TMPV'], 'LTIM':['LT'], 'LTIMINDTREE':['LT'] };
        const aliasHits = (ALIASES[q]||[]).map(a=>({symbol:a+'.NS',shortname:a,longname:q,exchange:'NSI',quoteType:'EQUITY'}));
        // exact match first
        const exact = NSE_UNIVERSE.includes(q) ? [{symbol:q+'.NS',shortname:q,longname:q,exchange:'NSI',quoteType:'EQUITY'}] : [];
        // prefix match (query starts symbol) — not loose includes
        const prefix = NSE_UNIVERSE.filter(s => s.startsWith(q) && s !== q).slice(0,5)
          .map(s => ({ symbol: s+'.NS', shortname: s, longname: s, exchange: 'NSI', quoteType: 'EQUITY' }));
        const all = [...aliasHits, ...exact, ...prefix].slice(0,10);
        return { quotes: all };
      } catch {}
    }
    return { quotes: [] };
  }
}

async function getIndices() {
  const symbols = Object.values(INDICES);
  const quotes = await getQuotes(symbols);
  return quotes.map(q => ({
    symbol: q.symbol,
    name: Object.keys(INDICES).find(k => INDICES[k] === q.symbol) || q.shortName || q.symbol,
    price: q.regularMarketPrice,
    change: q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    high: q.regularMarketDayHigh,
    low: q.regularMarketDayLow
  }));
}

async function getTopMovers() {
  // Use NIFTY 50 pre-defined list to scan gainers/losers
  const NIFTY50 = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC", "LT", "KOTAKBANK", "LTIM", "AXISBANK", "ASIANPAINT", "MARUTI", "TITAN", "SUNPHARMA", "BAJFINANCE", "HCLTECH", "WIPRO", "ULTRACEMCO", "NESTLEIND", "POWERGRID", "NTPC", "ONGC", "TATAMOTORS", "TATASTEEL", "HINDALCO", "JSWSTEEL", "ADANIENT", "ADANIPORTS", "COALINDIA", "BPCL", "BRITANNIA", "EICHERMOT", "GRASIM", "HEROMOTOCO", "HINDUNILVR", "CIPLA", "DIVISLAB", "DRREDDY", "APOLLOHOSP", "BAJAJ-AUTO", "BAJAJFINSV", "INDUSINDBK", "M&M", "SHREECEM", "TECHM", "UPL", "SBILIFE", "TATACONSUM"];
  const quotes = await getQuotes(NIFTY50);
  const sorted = quotes.filter(q => !q.error).sort((a, b) => (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0));
  return {
    gainers: sorted.slice(0, 5),
    losers: sorted.slice(-5).reverse(),
    all: sorted
  };
}

export default { getQuote, getQuotes, getHistorical, getQuoteSummary, search, getIndices, getTopMovers, normalizeSymbol };
