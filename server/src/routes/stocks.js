import express from 'express';
import realtime from '../services/realtimeService.js';
import yahooService from '../services/yahooService.js';
import screener from '../services/screenerService.js';
import newsService from '../services/newsService.js';
import targetService from '../services/targetService.js';
import indexService from '../services/indexService.js';
import ratiosService from '../services/ratiosService.js';
import aiService from '../services/aiService.js';
import aiPicksService from '../services/aiPicksService.js';
import companyInfoService from '../services/companyInfoService.js';
import { FALLBACK } from '../data/fallbackFundamentals.js';
import { sma, ema, rsi, macd, bollingerBands, analyzeIndicators } from '../utils/indicators.js';

const router = express.Router();

// GET /api/stocks/quote/:symbol  -> RELIANCE or RELIANCE.NS (REAL-TIME via Yahoo direct chart)
router.get('/quote/:symbol', async (req, res) => {
  try {
    const q = await realtime.getQuote(req.params.symbol);
    res.json(q);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/stocks/quotes  body: { symbols: ["RELIANCE", "TCS.NS"] }
router.post('/quotes', async (req, res) => {
  try {
    const quotes = await realtime.getQuotes(req.body.symbols || []);
    res.json(quotes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stocks/history/:symbol?period=1mo&interval=1d
router.get('/history/:symbol', async (req, res) => {
  try {
    const { period = '3mo', interval = '1d' } = req.query;
    const data = await realtime.getHistorical(req.params.symbol, period, interval);
    // Add indicators
    const closes = data.map(d => d.close);
    if (closes.length > 20) {
      const sma20 = sma(closes, 20);
      const sma50 = sma(closes, 50);
      const rsiVals = rsi(closes);
      const macdVals = macd(closes);
      const bb = bollingerBands(closes);
      const enriched = data.map((d, i) => ({
        ...d,
        sma20: sma20[i],
        sma50: sma50[i],
        rsi: rsiVals[i],
        macd: macdVals.macdLine[i],
        signal: macdVals.signalLine[i],
        bbUpper: bb.upper[i],
        bbLower: bb.lower[i]
      }));
      return res.json(enriched);
    }
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stocks/analysis/:symbol
router.get('/analysis/:symbol', async (req, res) => {
  try {
    const data = await realtime.getHistorical(req.params.symbol, '1y', '1d');
    const closes = data.map(d => d.close);
    const analysis = analyzeIndicators(closes);
    const quote = await realtime.getQuote(req.params.symbol);
    // Try screener with 4s timeout, else fallback to hardcoded map (screener currently rate-limited after 2000 scan)
    const withTimeout = (p, ms) => Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')), ms))]);
    let fund = null;
    try{ fund = await withTimeout(screener.getFundamentals(req.params.symbol), 2000); }catch{}
    if(!fund || !fund.pe){
      const fb = FALLBACK[req.params.symbol.replace('.NS','').toUpperCase()];
      if(fb) fund = fb;
    }
    const summary = fund ? null : await yahooService.getQuoteSummary(req.params.symbol).catch(() => null);

    // Prefer screener fundamentals, fill missing 52W from realtime quote if needed
    const week52HighFromQuote = quote.fiftyTwoWeekHigh || quote._chart?.meta?.fiftyTwoWeekHigh;
    const week52LowFromQuote = quote.fiftyTwoWeekLow || quote._chart?.meta?.fiftyTwoWeekLow;
    // Google-style KPI: accurate latest values from realtime + screener
    const kpi = {
      open: quote.regularMarketOpen,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      mktCap: fund?.marketCap || (quote.marketCap?.fmt) || '-',
      pe: fund?.pe || summary?.summaryDetail?.trailingPE?.fmt || summary?.summaryDetail?.trailingPE || '-',
      volume: quote.regularMarketVolume,
      prevClose: quote.previousClose,
      week52High: fund?.week52High || week52HighFromQuote,
      week52Low: fund?.week52Low || week52LowFromQuote
    };
    res.json({
      symbol: req.params.symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      indicators: analysis,
      kpi,
      fundamentals: fund ? {
        pe: fund.pe,
        marketCap: fund.marketCap,
        week52High: fund.week52High || week52HighFromQuote,
        week52Low: fund.week52Low || week52LowFromQuote,
        dividendYield: fund.dividendYield,
        bookValue: fund.bookValue,
        currentPrice: fund.currentPrice,
        source: fund.source
      } : summary ? {
        pe: summary.summaryDetail?.trailingPE,
        eps: summary.defaultKeyStatistics?.trailingEps,
        marketCap: summary.price?.marketCap,
        week52High: summary.summaryDetail?.fiftyTwoWeekHigh || week52HighFromQuote,
        week52Low: summary.summaryDetail?.fiftyTwoWeekLow || week52LowFromQuote,
        dividendYield: summary.summaryDetail?.dividendYield,
        avgVolume: summary.price?.averageDailyVolume10Day
      } : {
        week52High: week52HighFromQuote,
        week52Low: week52LowFromQuote
      },
      lastCandle: data[data.length - 1]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stocks/search?q=reliance
router.get('/search', async (req, res) => {
  try {
    const result = await yahooService.search(req.query.q);
    // Filter to NSE/BSE only
    const filtered = result.quotes.filter(q => q.exchange === 'NSI' || q.exchange === 'BOM' || q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO'));
    res.json(filtered);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stocks/movers?period=1d|5d|1mo&index=NIFTY 50  (Today / Week / Month + Index selector)
router.get('/movers', async (req, res) => {
  try {
    const period = req.query.period || '1d';
    const indexName = req.query.index || 'NIFTY 50';
    const stocks = indexService.getStocksForIndex(indexName);
    if (period === '1d') {
      const quotes = await realtime.getQuotes(stocks);
      const sorted = quotes.filter(q => !q.error).sort((a, b) => (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0));
      return res.json({ period, index: indexName, gainers: sorted.slice(0,5), losers: sorted.slice(-5).reverse(), all: sorted });
    }
    const range = period === '5d' ? '5d' : '1mo';
    const interval = '1d';
    const all = [];
    for(let i=0;i<stocks.length;i+=5){
      const chunk = stocks.slice(i,i+5);
      const chunkData = await Promise.all(chunk.map(async sym=>{
        try{
          const hist = await realtime.getHistorical(sym, range, interval);
          if(!hist.length) return null;
          const start = hist[0].close;
          const end = hist[hist.length-1].close;
          const pct = ((end - start)/start)*100;
          const quote = await realtime.getQuote(sym);
          return { symbol: quote.symbol, shortName: sym, regularMarketPrice: end, regularMarketChange: end-start, regularMarketChangePercent: pct };
        }catch{ return null }
      }));
      all.push(...chunkData.filter(Boolean));
      if(i+5 < stocks.length) await new Promise(r=>setTimeout(r,400));
    }
    const sorted = all.sort((a,b)=>b.regularMarketChangePercent-a.regularMarketChangePercent);
    res.json({ period, index: indexName, gainers: sorted.slice(0,5), losers: sorted.slice(-5).reverse(), all: sorted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/indices/list - available indices for selector
router.get('/indices/list', async (req, res) => {
  res.json(indexService.listIndices());
});

// POST /api/stocks/screener  body: { minPrice, maxPE, minChangePercent }
router.post('/screener', async (req, res) => {
  try {
    const { minPrice = 0, gainersOnly = false } = req.body;
    const NIFTY50 = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC", "LT", "KOTAKBANK", "LTIM", "AXISBANK", "ASIANPAINT", "MARUTI", "TITAN", "SUNPHARMA", "BAJFINANCE", "HCLTECH", "WIPRO", "ULTRACEMCO", "NESTLEIND", "POWERGRID", "NTPC", "ONGC", "TATAMOTORS", "TATASTEEL", "HINDALCO", "JSWSTEEL", "ADANIENT", "ADANIPORTS", "COALINDIA", "BPCL", "BRITANNIA", "EICHERMOT", "GRASIM", "HEROMOTOCO", "HINDUNILVR", "CIPLA", "DIVISLAB", "DRREDDY", "APOLLOHOSP", "BAJAJ-AUTO", "BAJAJFINSV", "INDUSINDBK", "M&M", "SHREECEM", "TECHM", "UPL", "SBILIFE", "TATACONSUM"];
    const quotes = await realtime.getQuotes(NIFTY50);
    let filtered = quotes;
    if (gainersOnly) filtered = filtered.filter(q => q.regularMarketChangePercent > 0);
    filtered = filtered.filter(q => (q.regularMarketPrice || 0) >= minPrice);
    res.json(filtered.slice(0, 20));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stocks/news/:symbol - latest top news for that company
router.get('/news/:symbol', async (req, res) => {
  try {
    const news = await newsService.getNews(req.params.symbol);
    res.json(news);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stocks/target/:symbol - target price KPI from reputed sources
router.get('/target/:symbol', async (req, res) => {
  try {
    const data = await targetService.getTargetPrice(req.params.symbol);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stocks/ratios/:symbol - financial ratios from screener.in
router.get('/ratios/:symbol', async (req, res) => {
  try {
    const data = await ratiosService.getRatios(req.params.symbol);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stocks/ai/:symbol - AI score out of 100, summary, pros/cons, forecast
router.get('/ai/:symbol', async (req, res) => {
  try {
    const data = await aiService.getAIAnalysis(req.params.symbol);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stocks/ai-picks - Top 30 AI picks (10 per portfolio) - Full market 2000
router.get('/ai-picks', async (req, res) => {
  try {
    const data = await aiPicksService.getAIPicks();
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/ai-picks/progress', async (req, res) => {
  try {
    const p = aiPicksService.getScanProgress();
    res.json(p);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stocks/info/:symbol - company info + wikipedia
router.get('/info/:symbol', async (req, res) => {
  try{
    const data = await companyInfoService.getCompanyInfo(req.params.symbol);
    res.json(data);
  }catch(e){ res.status(500).json({ error: e.message }); }
});

export default router;
