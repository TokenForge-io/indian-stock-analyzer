import NodeCache from 'node-cache';
import aiService from './aiService.js';
import realtime from './realtimeService.js';
import { NSE_UNIVERSE } from '../data/nseUniverse.js';

const cache = new NodeCache({ stdTTL: 1800 });
let scanProgress = { status: 'idle', scanned: 0, total: NSE_UNIVERSE.length, percent: 0, found: 0 };
let fullScanCache = null;
let isScanning = false;

const UNIVERSE_SMALL = [
  "RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SBIN","BHARTIARTL","ITC","LT","KOTAKBANK",
  "LTIM","AXISBANK","ASIANPAINT","MARUTI","TITAN","SUNPHARMA","BAJFINANCE","HCLTECH","WIPRO","ULTRACEMCO",
  "NESTLEIND","POWERGRID","NTPC","ONGC","TATAMOTORS","TATASTEEL","HINDALCO","JSWSTEEL","ADANIENT","ADANIPORTS",
  "COALINDIA","BPCL","BRITANNIA","EICHERMOT","GRASIM","HEROMOTOCO","HINDUNILVR","CIPLA","DIVISLAB","DRREDDY",
  "APOLLOHOSP","BAJAJ-AUTO","BAJAJFINSV","INDUSINDBK","M&M","SHREECEM","TECHM","UPL","SBILIFE","TATACONSUM",
  "BANKBARODA","PNB","AUBANK","FEDERALBNK","IDFCFIRSTB"
];

function categorize(stock){
  const score = stock.score;
  const vol = stock.past.volatility;
  const upside = stock.forecast.upside || 0;
  const roe = parseFloat(stock.present.roe) || 0;
  const pe = parseFloat(stock.present.pe) || 0;
  const steadyScore = (score >= 60 ? 3 : 0) + (vol < 2.8 ? 2 : 0) + (roe > 12 ? 2 : 0) + (pe>10 && pe<30 ? 1 : 0) + (upside>=5 && upside<=14 ? 2 : 0);
  const midScore = (score >=55 && score <=82 ? 3 : 0) + (vol>=1.8 && vol<=3.8 ? 2 : 0) + (upside>=8 && upside<=18 ? 2 : 0) + (roe>8 ? 1 : 0);
  const aggScore = (upside > 13 ? 3 : 0) + (vol > 3 ? 2 : 0) + (score>=40 && score<=72 ? 2 : 0) + (pe<15 || pe>35 ? 1 : 0);
  if(steadyScore >= 6 && vol < 3.2 && score>=58) return 'steady';
  if(aggScore >= 6 && upside>12) return 'aggressive';
  return 'mid';
}

async function scanUniverse(symbols, label){
  // Fast path for FULL 2000: 2-phase scan (quick filter 2000 -> deep 100)
  const isFull = symbols.length > 200;
  if(isFull){
    return await scanUniverseFast(symbols, label);
  }
  const results = [];
  scanProgress = { status: `scanning ${label}`, scanned: 0, total: symbols.length, percent: 0, found: 0 };
  for(let i=0;i<symbols.length;i+=5){
    const chunk = symbols.slice(i,i+5);
    const chunkRes = await Promise.all(chunk.map(async sym=>{
      try{
        const quote = await realtime.getQuote(sym).catch(()=>null);
        if(!quote || !quote.regularMarketPrice || quote.regularMarketPrice < 10) return null;
        if(quote.regularMarketVolume && quote.regularMarketVolume < 50000) return null;
        const ai = await aiService.getAIAnalysis(sym);
        if(ai.score < 25) return null;
        return ai;
      }catch(e){ return null; }
    }));
    const valid = chunkRes.filter(Boolean);
    results.push(...valid);
    scanProgress.scanned = Math.min(symbols.length, i+5);
    scanProgress.percent = Math.round((scanProgress.scanned / symbols.length)*100);
    scanProgress.found = results.length;
    console.log(`AI Picks ${label}: ${scanProgress.scanned}/${symbols.length} (${scanProgress.percent}%) found ${results.length}`);
    if(i+5 < symbols.length) await new Promise(r=>setTimeout(r, 600));
  }
  return results;
}

async function scanUniverseFast(symbols, label){
  // Phase 1: quick filter using only quote + 1mo history (2 calls) - no screener/news/target
  const quickResults = [];
  scanProgress = { status: `${label} Phase 1/2: quick filter`, scanned: 0, total: symbols.length, percent: 0, found: 0 };
  for(let i=0;i<symbols.length;i+=20){
    const chunk = symbols.slice(i,i+20);
    const chunkRes = await Promise.all(chunk.map(async sym=>{
      try{
        const quote = await realtime.getQuote(sym).catch(()=>null);
        if(!quote || !quote.regularMarketPrice || quote.regularMarketPrice < 5) return null;
        if(quote.regularMarketVolume && quote.regularMarketVolume < 30000) return null;
        const hist = await realtime.getHistorical(sym, '1mo', '1d').catch(()=>[]);
        if(!hist.length) return null;
        const start = hist[0].close, end = hist[hist.length-1].close;
        const ret1m = ((end - start)/start)*100;
        const vol = hist.slice(-20).reduce((s,_,idx,arr)=> idx? s+Math.pow((arr[idx].close-arr[idx-1].close)/arr[idx-1].close,2):s,0);
        const volatility = Math.sqrt(vol/20)*100;
        // Quick score: momentum + low vol bonus
        const quickScore = ret1m*2 - volatility*0.5 + (quote.regularMarketPrice > 50 ? 5 : 0);
        return { symbol: sym, quickScore, ret1m, volatility, quote, hist };
      }catch{ return null; }
    }));
    const valid = chunkRes.filter(Boolean);
    quickResults.push(...valid);
    scanProgress.scanned = Math.min(symbols.length, i+20);
    scanProgress.percent = Math.round((scanProgress.scanned / symbols.length)*40); // Phase 1 is 40% of total
    scanProgress.found = quickResults.length;
    console.log(`AI Picks ${label} Phase1: ${scanProgress.scanned}/${symbols.length} (${scanProgress.percent}%) quick found ${quickResults.length}`);
    if(i+20 < symbols.length) await new Promise(r=>setTimeout(r, 250));
  }
  // Take top 120 by quickScore for deep analysis
  quickResults.sort((a,b)=> b.quickScore - a.quickScore);
  const topCandidates = quickResults.slice(0, 120).map(r=>r.symbol);
  console.log(`AI Picks ${label} Phase1 done, top 120 selected for deep AI`);

  // Phase 2: deep AI only for top 120
  const results = [];
  scanProgress.status = `${label} Phase 2/2: deep AI Top 120`;
  scanProgress.scanned = symbols.length;
  for(let i=0;i<topCandidates.length;i+=5){
    const chunk = topCandidates.slice(i,i+5);
    const chunkRes = await Promise.all(chunk.map(async sym=>{
      try{
        const ai = await aiService.getAIAnalysis(sym);
        if(ai.score < 25) return null;
        return ai;
      }catch{ return null; }
    }));
    results.push(...chunkRes.filter(Boolean));
    scanProgress.percent = 40 + Math.round(((i+5)/topCandidates.length)*60);
    scanProgress.found = results.length;
    console.log(`AI Picks ${label} Phase2: ${i+5}/${topCandidates.length} deep found ${results.length} (${scanProgress.percent}%)`);
    if(i+5 < topCandidates.length) await new Promise(r=>setTimeout(r, 600));
  }
  scanProgress.percent = 100;
  scanProgress.found = results.length;
  return results;
}

async function buildPicksFromResults(results, scannedLabel){
  results.sort((a,b)=> b.score - a.score);
  const steady = [], mid = [], aggressive = [];
  for(const s of results){
    const cat = categorize(s);
    if(cat==='steady' && steady.length < 10) steady.push(s);
    else if(cat==='aggressive' && aggressive.length < 10) aggressive.push(s);
    else if(mid.length < 10) mid.push(s);
  }
  const used = new Set([...steady,...mid,...aggressive].map(s=>s.symbol));
  for(const s of results){
    if(steady.length >=10 && mid.length >=10 && aggressive.length >=10) break;
    if(used.has(s.symbol)) continue;
    if(steady.length < 10) { steady.push(s); used.add(s.symbol); }
    else if(mid.length < 10) { mid.push(s); used.add(s.symbol); }
    else if(aggressive.length < 10) { aggressive.push(s); used.add(s.symbol); }
  }
  while(steady.length < 10){
    const r = results.find(x=> ![...steady,...mid,...aggressive].some(y=>y.symbol===x.symbol));
    if(!r) break; steady.push(r);
  }
  while(mid.length < 10){
    const r = results.find(x=> ![...steady,...mid,...aggressive].some(y=>y.symbol===x.symbol));
    if(!r) break; mid.push(r);
  }
  while(aggressive.length < 10){
    const r = results.find(x=> ![...steady,...mid,...aggressive].some(y=>y.symbol===x.symbol));
    if(!r) break; aggressive.push(r);
  }
  steady.sort((a,b)=>b.score-a.score);
  mid.sort((a,b)=>b.score-a.score);
  aggressive.sort((a,b)=>b.forecast.upside - a.forecast.upside);
  return {
    steady: steady.slice(0,10).map(s=>({ symbol: s.symbol, score: s.score, verdict: s.verdict, price: s.present.price, target: s.forecast.target, upside: s.forecast.upside, pe: s.present.pe, roe: s.present.roe, rsi: s.past.rsi, pros: s.pros.slice(0,3), cons: s.cons.slice(0,2), summary: s.summary })),
    mid: mid.slice(0,10).map(s=>({ symbol: s.symbol, score: s.score, verdict: s.verdict, price: s.present.price, target: s.forecast.target, upside: s.forecast.upside, pe: s.present.pe, roe: s.present.roe, rsi: s.past.rsi, pros: s.pros.slice(0,3), cons: s.cons.slice(0,2), summary: s.summary })),
    aggressive: aggressive.slice(0,10).map(s=>({ symbol: s.symbol, score: s.score, verdict: s.verdict, price: s.present.price, target: s.forecast.target, upside: s.forecast.upside, pe: s.present.pe, roe: s.present.roe, rsi: s.past.rsi, pros: s.pros.slice(0,3), cons: s.cons.slice(0,2), summary: s.summary })),
    updatedAt: new Date().toISOString(),
    scanned: results.length,
    totalScanned: NSE_UNIVERSE.length,
    disclaimer: scannedLabel.includes('2000') ? 'Top 30 AI picks — 10 per portfolio across NSE Full Market (2,000 scanned) • Scores out of 100 • Not SEBI advice' : 'Top 30 AI picks — 10 per portfolio across NSE Top 55 • Scores out of 100 • Full market scan in progress — will update to 2,000'
  };
}

export async function startFullScan(){
  if(isScanning) return;
  isScanning = true;
  scanProgress = { status: 'scanning full market', scanned: 0, total: NSE_UNIVERSE.length, percent: 0, found: 0 };
  console.log('Starting FULL MARKET scan of', NSE_UNIVERSE.length, 'stocks...');
  try{
    const results = await scanUniverse(NSE_UNIVERSE, 'FULL 2000');
    const picks = await buildPicksFromResults(results, 'FULL 2000');
    fullScanCache = picks;
    cache.set('ai-picks-full', picks);
    scanProgress = { status: 'done', scanned: NSE_UNIVERSE.length, total: NSE_UNIVERSE.length, percent: 100, found: results.length };
    console.log('FULL MARKET scan done:', picks.steady.length, picks.mid.length, picks.aggressive.length);
  }catch(e){
    console.error('Full scan failed', e.message);
    scanProgress.status = 'failed';
  }finally{
    isScanning = false;
  }
}

// Full 2,000 scan only on demand (button) to avoid hammering Screener and blocking KPI - was auto-starting and causing 429
// setTimeout(()=> startFullScan().catch(()=>{}), 5000); // disabled - now manual via /ai-picks?full=true or background low-priority

let smallScanPromise = null;

async function ensureSmallScan(){
  const key = 'ai-picks-small';
  if(cache.get(key) || smallScanPromise) return;
  smallScanPromise = (async()=>{
    console.log('AI Picks: background small scan (55) started...');
    scanProgress = { status: 'scanning SMALL 55', scanned: 0, total: UNIVERSE_SMALL.length, percent: 0, found: 0 };
    const results = await scanUniverse(UNIVERSE_SMALL, 'SMALL 55');
    const picks = await buildPicksFromResults(results, 'SMALL 55');
    cache.set(key, picks);
    console.log('Small scan done, cached 55');
    smallScanPromise = null;
  })().catch(e=>{ console.error('small scan fail', e.message); smallScanPromise=null; });
}

// Warm small scan in background 1 sec after start
setTimeout(()=> ensureSmallScan().catch(()=>{}), 1000);

export async function getAIPicks(){
  // If full scan done, return it
  if(fullScanCache) return fullScanCache;
  const fullCached = cache.get('ai-picks-full');
  if(fullCached) { fullScanCache = fullCached; return fullCached; }

  const key = 'ai-picks-small';
  const cached = cache.get(key);
  if(cached){
    if(!isScanning && !fullScanCache) startFullScan().catch(()=>{});
    return { ...cached, progress: scanProgress, fullMarket: false };
  }

  // No cache yet - ensure scan started in background and return progress immediately (non-blocking)
  ensureSmallScan().catch(()=>{});
  // Return empty picks with progress so frontend doesn't block
  return {
    steady: [], mid: [], aggressive: [],
    scanned: 0,
    totalScanned: UNIVERSE_SMALL.length,
    progress: scanProgress,
    fullMarket: false,
    disclaimer: 'Scanning 55 NSE stocks in background... please wait 30s',
    updatedAt: new Date().toISOString()
  };
}

export function getScanProgress(){
  return { ...scanProgress, isScanning, hasFullCache: !!fullScanCache };
}

export default { getAIPicks, getScanProgress, startFullScan };
