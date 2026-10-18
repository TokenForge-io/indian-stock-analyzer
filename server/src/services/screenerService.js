import axios from 'axios';
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour

export async function getFundamentals(symbol) {
  const sym = symbol.replace('.NS','').replace('.BO','').toUpperCase();
  const key = `fund:${sym}`;
  const cached = cache.get(key);
  if (cached) return cached;

  // Fast fail — screener.in blocks cloud IPs (Render/AWS). FALLBACK data covers this.
  for(let attempt=0; attempt<1; attempt++){
    try {
      const r = await axios.get(`https://www.screener.in/company/${sym}/`, {
        headers: { 
          'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept':'text/html,application/xhtml+xml',
          'Accept-Language':'en-US,en;q=0.9'
        },
        timeout: 4000
      });
    const html = r.data;
    const start = html.indexOf('id="top-ratios"');
    const snippet = html.slice(start, start+8000);

    const extract = (name) => {
      // Match: <span class="name"> NAME </span> ... <span class="number">VALUE</span>
      const re = new RegExp(`<span class="name">\\s*${name}\\s*<\\/span>[\\s\\S]*?<span class="number">([^<]+)<\\/span>`, 'i');
      const m = snippet.match(re);
      return m ? m[1].trim() : null;
    };

    // High / Low has two numbers
    const hlMatch = snippet.match(/High \/ Low[\s\S]*?<span class="number">([^<]+)<\/span>\s*\/\s*<span class="number">([^<]+)<\/span>/);
    const high = hlMatch ? hlMatch[1].trim() : null;
    const low = hlMatch ? hlMatch[2].trim() : null;

    const result = {
      pe: extract('Stock P\\/E'),
      marketCap: extract('Market Cap') ? `₹${extract('Market Cap')} Cr` : null,
      week52High: high,
      week52Low: low,
      dividendYield: extract('Dividend Yield') ? `${extract('Dividend Yield')}%` : null,
      bookValue: extract('Book Value'),
      roce: extract('ROCE'),
      roe: extract('ROE'),
      currentPrice: extract('Current Price'),
      source: 'screener.in'
    };
    cache.set(key, result);
    return result;
    } catch (e) {
      console.warn(`screener blocked ${sym} (cloud IP)`);
      return { _blocked: true };
    }
  }
  return { _blocked: true };
}
export default { getFundamentals };
