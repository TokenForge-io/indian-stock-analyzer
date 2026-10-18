import axios from 'axios';
import NodeCache from 'node-cache';
import yahooService from './yahooService.js';
import { FALLBACK } from '../data/fallbackFundamentals.js';
const cache = new NodeCache({ stdTTL: 3600 });

// Yahoo fallback — screener.in is blocked from cloud IPs (Render/AWS)
async function ratiosFromYahoo(sym){
  const s = await yahooService.getQuoteSummary(sym);
  if(!s) return null;
  const d = s.defaultKeyStatistics || {};
  const f = s.financialData || {};
  const t = s.summaryDetail || {};
  const p = s.price || {};
  const eps = d.trailingEps?.fmt || '-';
  const bvNum = d.bookValue?.raw;
  // Yahoo returns {} for returnOnEquity on most Indian stocks — derive ROE = EPS / book value
  let roe = f.returnOnEquity?.fmt || '-';
  if(roe === '-' && d.trailingEps?.raw && bvNum){
    roe = `${((d.trailingEps.raw / bvNum) * 100).toFixed(2)} (derived)`;
  }
  const kpi = {
    pe: t.trailingPE?.fmt || d.trailingPE?.fmt || '-',
    pb: d.priceToBook?.fmt || '-',
    roe,
    roce: '-',
    debtToEquity: f.debtToEquity?.raw != null ? `${f.debtToEquity.raw.toFixed(2)}%` : '-',
    currentRatio: f.currentRatio?.raw != null ? f.currentRatio.raw.toFixed(2) : '-',
    interestCoverage: f.interestCoverage?.fmt || '-',
    peg: d.pegRatio?.fmt || '-',
    dividendYield: t.dividendYield?.fmt || '-',
    roceLatest: '-',
    marketCap: p.marketCap?.raw ? `₹${(p.marketCap.raw / 1e7).toLocaleString('en-IN', {maximumFractionDigits: 0})} Cr` : '-',
    bookValue: bvNum ? `₹${bvNum.toFixed(0)}` : '-',
    faceValue: '-',
    week52High: t.fiftyTwoWeekHigh?.fmt || p.fiftyTwoWeekHigh?.fmt || '-',
    week52Low: t.fiftyTwoWeekLow?.fmt || p.fiftyTwoWeekLow?.fmt || '-',
    debtorDays: '-',
    inventoryDays: '-',
    eps,
    beta: t.beta?.fmt || '-',
    profitMargin: f.profitMargins?.fmt || '-',
    revenueGrowth: f.revenueGrowth?.fmt || '-',
    source: 'Yahoo Finance'
  };
  return kpi;
}

// v8 chart endpoint — no crumb, works from cloud/datacenter IPs. Gives live price + 52W range.
async function fetchChartMeta(bare){
  try{
    const r = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(bare)}.NS?interval=1d&range=5d`, {
      headers: {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
      timeout: 8000
    });
    const meta = r.data?.chart?.result?.[0]?.meta;
    if(!meta) return {};
    return { price: meta.regularMarketPrice, high: meta.fiftyTwoWeekHigh, low: meta.fiftyTwoWeekLow };
  }catch{ return {}; }
}

const fmtInr = (n) => (n==null || isNaN(n)) ? '-' : n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
function parseShares(v){
  if(!v) return null;
  const m = String(v).replace(/,/g,'').match(/^([\d.]+)\s*([BMT])?/i);
  if(!m) return null;
  const n = parseFloat(m[1]);
  const unit = (m[2]||'').toUpperCase();
  return n * (unit==='T'?1e12:unit==='B'?1e9:unit==='M'?1e6:1);
}

// StockAnalysis.com (CDN-hosted, reachable from cloud IPs) — rich fundamental ratios
async function ratiosFromStockAnalysis(sym){
  const bare = sym.replace('.NS','').replace('.BO','').toUpperCase();
  let page;
  try{
    const r = await axios.get(`https://stockanalysis.com/quote/nse/${encodeURIComponent(bare)}/statistics/`, {
      headers: {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
      timeout: 10000
    });
    page = String(r.data).replace(/<!--[\s\S]*?-->/g,'');
  }catch{ return null; }
  const map = {};
  const re = /<td[^>]*>\s*<span>([^<]+)<\/span>\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/g;
  let m;
  while((m = re.exec(page))) map[m[1].trim()] = m[2].trim();
  if(!map['PE Ratio'] && !map['Book Value Per Share']) return null;
  const clean = (v) => (!v || /^n\/a$/i.test(v) ? '-' : v);
  const eps = clean(map['Earnings Per Share (EPS)']);
  const bvps = clean(map['Book Value Per Share']);
  let roe = clean(map['Return on Equity (ROE)']);
  if(roe === '-' && eps !== '-' && bvps !== '-'){
    const r2 = (parseFloat(eps) / parseFloat(bvps)) * 100;
    if(isFinite(r2)) roe = `${r2.toFixed(2)} (derived)`;
  }
  let roce = clean(map['Return on Capital Employed (ROCE)']);
  if(roce === '-') roce = clean(map['Return on Invested Capital (ROIC)']);

  const meta = await fetchChartMeta(bare);
  const shares = parseShares(map['Shares Outstanding']);
  const marketCap = (shares && meta.price) ? `₹${fmtInr(Math.round(shares * meta.price / 1e7))} Cr` : '-';

  return {
    pe: clean(map['PE Ratio']),
    pb: clean(map['PB Ratio']),
    roe,
    roce,
    debtToEquity: clean(map['Debt / Equity']),
    currentRatio: clean(map['Current Ratio']),
    interestCoverage: clean(map['Interest Coverage']),
    peg: clean(map['PEG Ratio']),
    dividendYield: clean(map['Dividend Yield']),
    roceLatest: roce,
    marketCap,
    bookValue: bvps !== '-' ? `₹${bvps}` : '-',
    faceValue: '-',
    week52High: meta.high ? fmtInr(meta.high) : '-',
    week52Low: meta.low ? fmtInr(meta.low) : '-',
    debtorDays: '-',
    inventoryDays: '-',
    eps,
    beta: clean(map['Beta (5Y)']),
    profitMargin: clean(map['Profit Margin']),
    price: meta.price ? fmtInr(meta.price) : '-',
    source: 'StockAnalysis'
  };
}

// Last resort — static NIFTY table + live 52W range from the v8 chart endpoint
// (v8 chart needs no crumb and works from cloud IPs). Never returns null.
async function ratiosFromStatic(sym){
  const bare = sym.replace('.NS','').replace('.BO','').toUpperCase();
  const fb = FALLBACK[bare] || {};
  const meta = await fetchChartMeta(bare);
  return {
    pe: fb.pe || '-', pb: '-', roe: '-', roce: '-',
    debtToEquity: '-', currentRatio: '-', interestCoverage: '-', peg: '-',
    dividendYield: fb.dividendYield || '-',
    roceLatest: '-',
    marketCap: fb.marketCap || '-',
    bookValue: fb.bookValue || '-',
    faceValue: '-',
    week52High: meta.high ? fmtInr(meta.high) : (fb.week52High || '-'),
    week52Low: meta.low ? fmtInr(meta.low) : (fb.week52Low || '-'),
    debtorDays: '-', inventoryDays: '-',
    price: meta.price ? fmtInr(meta.price) : '-',
    source: 'Reference data'
  };
}

export async function getRatios(symbol){
  const sym = symbol.replace('.NS','').replace('.BO','').toUpperCase();
  const key = `ratios:${sym}`;
  const cached = cache.get(key);
  if(cached) return cached;

  // Cloud fallbacks: StockAnalysis.com (works from datacenter IPs) -> Yahoo -> static table
  const fallback = async () => {
    const sa = await ratiosFromStockAnalysis(sym).catch(()=>null);
    if(sa) return sa;
    const y = await ratiosFromYahoo(sym).catch(()=>null);
    if(y) return y;
    return await ratiosFromStatic(sym);
  };

  try{
    const r = await axios.get(`https://www.screener.in/company/${sym}/`, {
      headers: {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
      timeout: 4000
    });
    const html = r.data;

    // 1. Parse top-ratios (Market Cap, P/E, etc.) - already done in screenerService, but redo for ratios
    const ratios = {};

    // Helper to extract from top-ratios
    const topStart = html.indexOf('id="top-ratios"');
    if(topStart!==-1){
      const topSnippet = html.slice(topStart, topStart+8000);
      const topMap = {
        'Market Cap': 'Market Cap',
        'Stock P/E': 'PE',
        'Book Value': 'Book Value',
        'Dividend Yield': 'Dividend Yield',
        'ROCE': 'ROCE',
        'ROE': 'ROE',
        'Face Value': 'Face Value'
      };
      for(const [htmlName, keyName] of Object.entries(topMap)){
        const re = new RegExp(`<span class="name">\\s*${htmlName}\\s*<\\/span>[\\s\\S]*?<span class="number">([^<]+)<\\/span>`, 'i');
        const m = topSnippet.match(re);
        if(m) ratios[keyName] = m[1].trim();
      }
      // High / Low
      const hl = topSnippet.match(/High \/ Low[\s\S]*?<span class="number">([^<]+)<\/span>\s*\/\s*<span class="number">([^<]+)<\/span>/);
      if(hl){ ratios['52W High'] = hl[1].trim(); ratios['52W Low'] = hl[2].trim(); }
    }

    // 2. Parse detailed ratios table at id="ratios"
    const ratiosIdx = html.indexOf('id="ratios"');
    if(ratiosIdx!==-1){
      // Take next 80000 chars covering the table
      const ratiosHtml = html.slice(ratiosIdx, ratiosIdx+90000);
      // Regex for each row: <td class="text"> NAME </td> ... then tds with values, last td is latest
      const rowRegex = /<td class="text">\s*([^<]+?)\s*<\/td>([\s\S]*?)<\/tr>/g;
      let m;
      while(m=rowRegex.exec(ratiosHtml)){
        const name = m[1].trim().replace(/\s+/g,' ');
        const rowInner = m[2];
        // Extract all <td class=""> values
        const vals = [...rowInner.matchAll(/<td[^>]*>\s*([^<]*?)\s*<\/td>/g)].map(x=>x[1].trim()).filter(v=>v);
        // Last value is latest (2026)
        const latest = vals[vals.length-1];
        if(latest && latest !== '' && !latest.includes('Mar')) {
          // Clean up: remove % handling, keep as is
          ratios[name] = latest;
        }
      }
    }

    // 3. Normalize and pick key ratios to expose as KPI
    const kpi = {
      pe: ratios['PE'] || ratios['Stock P/E'] || '-',
      pb: ratios['Price to book value'] || ratios['P/B'] || '-',
      roe: ratios['ROE'] || '-',
      roce: ratios['ROCE'] || '-',
      debtToEquity: ratios['Debt to equity'] || ratios['Debt/Equity'] || '-',
      currentRatio: ratios['Current ratio'] || '-',
      interestCoverage: ratios['Interest Coverage'] || '-',
      peg: ratios['PEG Ratio'] || '-',
      dividendYield: ratios['Dividend Yield'] || '-',
      roceLatest: ratios['ROCE %'] || ratios['ROCE'] || '-',
      marketCap: ratios['Market Cap'] ? `₹${ratios['Market Cap']} Cr` : '-',
      bookValue: ratios['Book Value'] ? `₹${ratios['Book Value']}` : '-',
      faceValue: ratios['Face Value'] ? `₹${ratios['Face Value']}` : '-',
      week52High: ratios['52W High'] || '-',
      week52Low: ratios['52W Low'] || '-',
      debtorDays: ratios['Debtor Days'] || '-',
      inventoryDays: ratios['Inventory Days'] || '-',
      source: 'Screener.in',
      raw: ratios
    };
    // Filter to only include those we found
    // If screener returned a block/challenge page, all values are '-' — fall back to Yahoo
    const foundCount = Object.values(ratios).length;
    if(foundCount === 0){
      console.warn(`ratios screener parsed 0 values for ${sym} (blocked?) -> fallback chain`);
      const y = await fallback();
      cache.set(key, y);
      return y;
    }
    cache.set(key, kpi);
    return kpi;
  }catch(e){
    console.warn(`ratios screener fail ${sym}: ${e.message} -> fallback chain`);
    const y = await fallback();
    cache.set(key, y);
    return y;
  }
}
export default { getRatios };
