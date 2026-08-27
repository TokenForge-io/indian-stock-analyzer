import axios from 'axios';
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 3600 });

export async function getRatios(symbol){
  const sym = symbol.replace('.NS','').replace('.BO','').toUpperCase();
  const key = `ratios:${sym}`;
  const cached = cache.get(key);
  if(cached) return cached;

  try{
    const r = await axios.get(`https://www.screener.in/company/${sym}/`, {
      headers: {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
      timeout: 8000
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
      raw: ratios
    };
    // Filter to only include those we found
    cache.set(key, kpi);
    return kpi;
  }catch(e){
    console.warn(`ratios fail ${sym}: ${e.message}`);
    return null;
  }
}
export default { getRatios };
