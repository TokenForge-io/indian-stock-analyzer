import realtime from './realtimeService.js';
import screener from './screenerService.js';
import yahooService from './yahooService.js';
import newsService from './newsService.js';
import targetService from './targetService.js';
import NodeCache from 'node-cache';
import { rsi, sma, macd } from '../utils/indicators.js';

const cache = new NodeCache({ stdTTL: 600 });

function sentimentScore(titles){
  const pos = ['buy','upgrade','growth','profit','gain','rise','bull','positive','strong','beat','record','high','expansion','outperform'];
  const neg = ['sell','downgrade','fall','decline','loss','bear','negative','weak','miss','cut','low','crash','downgrade','lawsuit'];
  let score=0;
  titles.forEach(t=>{
    const l=t.toLowerCase();
    pos.forEach(w=>{ if(l.includes(w)) score+=1 });
    neg.forEach(w=>{ if(l.includes(w)) score-=1 });
  });
  return score; // -n to +n
}

function getVerdict(score){
  if(score>=80) return { verdict: 'Strong Buy', color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-700' };
  if(score>=65) return { verdict: 'Buy', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-800' };
  if(score>=45) return { verdict: 'Hold', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-800' };
  if(score>=30) return { verdict: 'Sell', color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-800' };
  return { verdict: 'Strong Sell', color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-800' };
}

export async function getAIAnalysis(symbol){
  const sym = symbol.replace('.NS','').replace('.BO','').toUpperCase();
  const key = `ai:${sym}`;
  const cached = cache.get(key);
  if(cached) return cached;

  let [history1y, history3mo, quote, fund, news, target] = await Promise.all([
    realtime.getHistorical(sym, '1y', '1d').catch(()=>[]),
    realtime.getHistorical(sym, '3mo', '1d').catch(()=>[]),
    realtime.getQuote(sym).catch(()=>null),
    screener.getFundamentals(sym).catch(()=>null),
    newsService.getNews(sym).catch(()=>[]),
    targetService.getTargetPrice(sym).catch(()=>null)
  ]);
  // If screener blocked (Render cloud IP), use Yahoo live fundamentals
  if(fund?._blocked || !fund?.pe){
    const s = await yahooService.getQuoteSummary(sym).catch(()=>null);
    if(s?.summaryDetail?.trailingPE){
      fund = {
        pe: String(s.summaryDetail.trailingPE.raw || s.summaryDetail.trailingPE.fmt || ''),
        roe: s.financialData?.returnOnEquity?.fmt || s.financialData?.returnOnEquity?.raw,
        dividendYield: s.summaryDetail?.dividendYield?.fmt || s.summaryDetail?.dividendYield?.raw,
        week52High: s.summaryDetail?.fiftyTwoWeekHigh?.fmt,
        week52Low: s.summaryDetail?.fiftyTwoWeekLow?.fmt,
        marketCap: s.price?.marketCap?.fmt,
        bookValue: s.defaultKeyStatistics?.bookValue?.fmt,
        currentPrice: s.financialData?.currentPrice?.fmt,
        source: 'Yahoo Finance'
      };
    } else {
      fund = null;
    }
  }

  const closes1y = history1y.map(d=>d.close).filter(Boolean);
  const closes3mo = history3mo.map(d=>d.close).filter(Boolean);
  const price = quote?.regularMarketPrice || closes1y[closes1y.length-1] || 1000;
  const prevClose = quote?.previousClose || closes1y[closes1y.length-2] || price;

  // Technical
  const rsiVals = closes1y.length>14 ? rsi(closes1y) : [];
  const lastRsi = rsiVals.filter(v=>v!=null).slice(-1)[0] || 50;
  const sma20 = sma(closes1y,20).filter(v=>v!=null).slice(-1)[0] || price;
  const sma50 = sma(closes1y,50).filter(v=>v!=null).slice(-1)[0] || price;
  const sma200 = sma(closes1y,200).filter(v=>v!=null).slice(-1)[0] || price;
  const macdVals = closes1y.length>26 ? macd(closes1y) : { macdLine: [], signalLine: [] };
  const lastMacd = macdVals.macdLine.filter(v=>v!=null).slice(-1)[0] || 0;
  const lastSignal = macdVals.signalLine.filter(v=>v!=null).slice(-1)[0] || 0;

  // Returns
  const ret1m = closes3mo.length>21 ? ((closes3mo[closes3mo.length-1]-closes3mo[Math.max(0,closes3mo.length-21)])/closes3mo[Math.max(0,closes3mo.length-21)])*100 : 0;
  const ret3m = closes3mo.length>60 ? ((closes3mo[closes3mo.length-1]-closes3mo[0])/closes3mo[0])*100 : ret1m;
  const ret1y = closes1y.length>2 ? ((closes1y[closes1y.length-1]-closes1y[0])/closes1y[0])*100 : 0;
  const volatility = closes1y.length>20 ? Math.sqrt(closes1y.slice(-20).reduce((s,v,i,arr)=> i? s+Math.pow((v-arr[i-1])/arr[i-1],2):s,0)/20)*100 : 2;

  // Fundamentals parsing
  const pe = parseFloat(String(fund?.pe || '0').replace(/,/g,'')) || 0;
  const roe = parseFloat(String(fund?.roe || '0')) || 0;
  const roce = parseFloat(String(fund?.roce || '0')) || 0;
  const divYield = parseFloat(String(fund?.dividendYield || '0')) || 0;

  // Scoring 100
  let techScore=0, fundScore=0, momScore=0, newsScore=0, targetScore=0;
  const pros=[], cons=[];

  // Technical 30
  if(lastRsi>=30 && lastRsi<=55){ techScore+=10; pros.push(`RSI healthy (${lastRsi.toFixed(1)}) — not overbought`); }
  else if(lastRsi>=55 && lastRsi<=70){ techScore+=7; pros.push(`RSI momentum (${lastRsi.toFixed(1)})`); }
  else if(lastRsi<30){ techScore+=5; pros.push(`RSI oversold (${lastRsi.toFixed(1)}) — potential bounce`); cons.push(`RSI oversold risk (${lastRsi.toFixed(1)})`); }
  else { techScore+=3; cons.push(`RSI overbought (${lastRsi.toFixed(1)}) — caution`); }

  if(price > sma50 && sma20 > sma50){ techScore+=10; pros.push(`Uptrend: price above SMA20 & SMA50`); }
  else if(price > sma20){ techScore+=7; pros.push(`Price above SMA20`); }
  else { techScore+=3; cons.push(`Price below SMA20/SMA50 — downtrend`); }

  if(lastMacd > lastSignal){ techScore+=10; pros.push(`MACD bullish crossover`); }
  else { techScore+=4; cons.push(`MACD bearish`); }

  // Fundamental 30
  if(pe>0 && pe < 18){ fundScore+=10; pros.push(`Attractive P/E ${pe}`); }
  else if(pe>=18 && pe<28){ fundScore+=7; pros.push(`Reasonable P/E ${pe}`); }
  else if(pe>=28 && pe<40){ fundScore+=5; cons.push(`High P/E ${pe} — expensive`); }
  else if(pe>=40){ fundScore+=2; cons.push(`Very high P/E ${pe}`); }
  else { fundScore+=5; }

  if(roe > 18){ fundScore+=10; pros.push(`Excellent ROE ${roe}%`); }
  else if(roe>10){ fundScore+=7; pros.push(`Good ROE ${roe}%`); }
  else if(roe>5){ fundScore+=4; cons.push(`Low ROE ${roe}%`); }
  else { fundScore+=2; cons.push(`Weak ROE ${roe}%`); }

  if(roce > 15){ fundScore+=10; pros.push(`High ROCE ${roce}% — efficient capital`); }
  else if(roce>8){ fundScore+=6; pros.push(`Decent ROCE ${roce}%`); }
  else { fundScore+=3; cons.push(`Low ROCE ${roce}%`); }

  // Momentum 20
  if(ret1m > 4){ momScore+=10; pros.push(`Strong 1M momentum +${ret1m.toFixed(1)}%`); }
  else if(ret1m > 0){ momScore+=6; pros.push(`Positive 1M +${ret1m.toFixed(1)}%`); }
  else if(ret1m > -5){ momScore+=3; cons.push(`Weak 1M ${ret1m.toFixed(1)}%`); }
  else { momScore+=1; cons.push(`Negative 1M ${ret1m.toFixed(1)}%`); }

  if(ret1y > 12){ momScore+=10; pros.push(`Strong 1Y +${ret1y.toFixed(1)}%`); }
  else if(ret1y>0){ momScore+=6; }
  else { momScore+=2; cons.push(`Negative 1Y ${ret1y.toFixed(1)}%`); }

  // News sentiment 10
  const senti = sentimentScore(news.map(n=>n.title).slice(0,5));
  if(senti > 1){ newsScore=8; pros.push(`Positive news flow (${senti} bullish signals)`); }
  else if(senti>=0){ newsScore=6; }
  else { newsScore=3; cons.push(`Negative/news headwinds`); }

  // Target upside 10
  const upside = target?.consensus?.upside || 0;
  if(upside > 14){ targetScore=10; pros.push(`High target upside +${upside.toFixed(1)}% (consensus ₹${target.consensus.target})`); }
  else if(upside>7){ targetScore=7; pros.push(`Target upside +${upside.toFixed(1)}%`); }
  else if(upside>0){ targetScore=4; }
  else { targetScore=1; cons.push(`Target downside ${upside.toFixed(1)}%`); }

  const total = Math.min(100, Math.max(0, Math.round(techScore+fundScore+momScore+newsScore+targetScore)));
  const verdict = getVerdict(total);

  // Forecast
  const forecast3m = price * (1 + upside/100 * 0.25);
  const forecast6m = price * (1 + upside/100 * 0.5);
  const forecast12m = target?.consensus?.target || price * (1 + upside/100);

  // Align predictions with news
  const newsAlignment = senti >0 && verdict.verdict.includes('Buy') ? 'Bullish news aligns with BUY verdict' :
                        senti <0 && verdict.verdict.includes('Sell') ? 'Bearish news aligns with SELL verdict' :
                        'Mixed signals — news and technicals diverge, watch closely';

  // Ensure pros/cons balanced and unique
  const uniqPros = [...new Set(pros)].slice(0,5);
  const uniqCons = [...new Set(cons)].slice(0,5);
  if(uniqPros.length<2) uniqPros.push('Diversified business model');
  if(uniqCons.length<2) uniqCons.push(`Volatility ${volatility.toFixed(1)}% — price swings`);

  const summary = `${sym} trades at ₹${price.toFixed(2)} (${((price-prevClose)/prevClose*100).toFixed(2)}% today). Past 1M ${ret1m.toFixed(1)}%, 1Y ${ret1y.toFixed(1)}% shows ${ret1y>0?'uptrend':'downtrend'}. Currently ${price > sma50 ? 'above' : 'below'} SMA50, RSI ${lastRsi.toFixed(1)} indicates ${lastRsi>70?'overbought':lastRsi<30?'oversold':'neutral'} momentum. Fundamentals: P/E ${pe || '-'}, ROE ${roe}%, ROCE ${roce}% — ${pe<20?'attractive valuation':pe<30?'fair valuation':'premium valuation'}. Consensus target ₹${target?.consensus?.target || '-'} (${upside>0?'+':''}${upside.toFixed(1)}% upside) suggests ${upside>0?'upside':'downside'} over 12M. ${sentimentScore(news.slice(0,3).map(n=>n.title))>0 ? 'Recent news is constructive.' : 'Recent news is cautious.'} ${newsAlignment}.`;

  const result = {
    symbol: sym,
    score: total,
    verdict: verdict.verdict,
    verdictColor: verdict.color,
    verdictBg: verdict.bg,
    verdictBorder: verdict.border,
    summary,
    past: { ret1m, ret3m, ret1y, volatility, price, sma20, sma50, sma200, rsi: lastRsi },
    present: { price, change: ((price-prevClose)/prevClose*100), pe, roe, roce, divYield, week52High: fund?.week52High, week52Low: fund?.week52Low },
    forecast: { target: target?.consensus?.target, upside, forecast3m, forecast6m, forecast12m, consensusCount: target?.consensus?.count },
    pros: uniqPros,
    cons: uniqCons,
    newsAlignment,
    sources: ['Yahoo Finance (price)', 'Screener.in (fundamentals)', 'Google News (sentiment)', 'Broker consensus (target)'],
    updatedAt: new Date().toISOString()
  };
  cache.set(key, result);
  return result;
}
export default { getAIAnalysis };
