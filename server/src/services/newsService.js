import axios from 'axios';
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 }); // 10 min

// Map symbol to searched company name for better news relevance
const NAME_MAP = {
  RELIANCE: 'Reliance Industries',
  TCS: 'Tata Consultancy Services TCS',
  INFY: 'Infosys',
  HDFCBANK: 'HDFC Bank',
  ICICIBANK: 'ICICI Bank',
  SBIN: 'State Bank of India SBI',
  BHARTIARTL: 'Bharti Airtel',
  ITC: 'ITC',
  LT: 'Larsen Toubro',
  KOTAKBANK: 'Kotak Mahindra Bank',
  ASIANPAINT: 'Asian Paints',
  MARUTI: 'Maruti Suzuki',
  TITAN: 'Titan Company',
  SUNPHARMA: 'Sun Pharma',
  BAJFINANCE: 'Bajaj Finance',
  HCLTECH: 'HCL Technologies',
  WIPRO: 'Wipro',
  ULTRACEMCO: 'UltraTech Cement',
  NESTLEIND: 'Nestle India',
  POWERGRID: 'Power Grid',
  NTPC: 'NTPC',
  ONGC: 'ONGC',
  TATAMOTORS: 'Tata Motors',
  TATASTEEL: 'Tata Steel',
  ADANIENT: 'Adani Enterprises',
  ADANIPORTS: 'Adani Ports'
};

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) && items.length < 8) {
    const block = m[1];
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([^<]+)<\/title>/))?.[1]?.trim();
    const link = (block.match(/<link>([^<]+)<\/link>/))?.[1]?.trim();
    const pubDate = (block.match(/<pubDate>([^<]+)<\/pubDate>/))?.[1]?.trim();
    const source = (block.match(/<source[^>]*>([^<]+)<\/source>/))?.[1]?.trim();
    if (title && link) items.push({ title: decodeHtml(title), link, pubDate, source: source || 'Google News', timeAgo: timeAgo(pubDate) });
  }
  return items;
}
function decodeHtml(s){ return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'"); }
function timeAgo(d){
  if(!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff/60000);
  if(mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins/60);
  if(hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs/24)}d ago`;
}

export async function getNews(symbol) {
  const sym = symbol.replace('.NS','').replace('.BO','').toUpperCase();
  const key = `news:${sym}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const queryName = NAME_MAP[sym] || sym;
  // Google News RSS - free, no key, India edition
  const q = encodeURIComponent(`${queryName} share news`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const r = await axios.get(url, {
      headers: { 'User-Agent':'Mozilla/5.0' },
      timeout: 8000
    });
    const news = parseRSS(r.data);
    if (news.length) {
      cache.set(key, news);
      return news;
    }
    throw new Error('no news from RSS');
  } catch (e) {
    console.warn(`news RSS fail ${sym}: ${e.message}`);
    // Fallback: generate placeholder using available info
    const fallback = [
      { title: `${queryName} - Check latest price & analysis on Screener`, link: `https://www.screener.in/company/${sym}/`, pubDate: new Date().toISOString(), source: 'Screener.in', timeAgo: 'now' },
      { title: `${queryName} stock news - search on Google`, link: `https://news.google.com/search?q=${queryName}`, pubDate: new Date().toISOString(), source: 'Google News', timeAgo: 'now' }
    ];
    cache.set(key, fallback, 60);
    return fallback;
  }
}

export default { getNews };
