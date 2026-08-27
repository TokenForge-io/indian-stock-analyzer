import axios from 'axios';
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 86400 }); // 24h

const WIKI_MAP = {
  RELIANCE: 'Reliance_Industries', TCS: 'Tata_Consultancy_Services', INFY: 'Infosys', HDFCBANK: 'HDFC_Bank',
  ICICIBANK: 'ICICI_Bank', SBIN: 'State_Bank_of_India', BHARTIARTL: 'Bharti_Airtel', ITC: 'ITC_Limited',
  LT: 'Larsen_%26_Toubro', KOTAKBANK: 'Kotak_Mahindra_Bank', ASIANPAINT: 'Asian_Paints', MARUTI: 'Maruti_Suzuki',
  TITAN: 'Titan_Company', SUNPHARMA: 'Sun_Pharmaceutical', BAJFINANCE: 'Bajaj_Finance', HCLTECH: 'HCL_Technologies',
  WIPRO: 'Wipro', ULTRACEMCO: 'UltraTech_Cement', NESTLEIND: 'Nestlé', POWERGRID: 'Power_Grid_Corporation_of_India',
  NTPC: 'NTPC_Limited', ONGC: 'Oil_and_Natural_Gas_Corporation', TATAMOTORS: 'Tata_Motors', TATASTEEL: 'Tata_Steel',
  HINDALCO: 'Hindalco_Industries', JSWSTEEL: 'JSW_Steel', ADANIENT: 'Adani_Enterprises', ADANIPORTS: 'Adani_Ports_and_SEZ',
  COALINDIA: 'Coal_India', BPCL: 'Bharat_Petroleum', BRITANNIA: 'Britannia_Industries', EICHERMOT: 'Eicher_Motors',
  GRASIM: 'Grasim_Industries', HEROMOTOCO: 'Hero_MotoCorp', HINDUNILVR: 'Hindustan_Unilever', CIPLA: 'Cipla',
  DIVISLAB: 'Divi%27s_Laboratories', DRREDDY: 'Dr._Reddy%27s_Laboratories', APOLLOHOSP: 'Apollo_Hospitals',
  BAJAJFINSV: 'Bajaj_Finserv', INDUSINDBK: 'IndusInd_Bank', 'M&M': 'Mahindra_%26_Mahindra', TECHM: 'Tech_Mahindra',
  SBILIFE: 'SBI_Life_Insurance_Company', 'BAJAJ-AUTO': 'Bajaj_Auto'
};

export async function getCompanyInfo(symbol){
  const sym = symbol.replace('.NS','').replace('.BO','').toUpperCase();
  const key = `info:${sym}`;
  const cached = cache.get(key);
  if(cached) return cached;

  try{
    const r = await axios.get(`https://www.screener.in/company/${sym}/`, {
      headers: { 'User-Agent':'Mozilla/5.0' },
      timeout: 8000
    });
    const html = r.data;
    // Extract company name from <h1>
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const name = nameMatch ? nameMatch[1].trim() : `${sym} Ltd`;
    // Extract about text (first <p> in company-profile)
    const aboutMatch = html.match(/<div class="sub show-more-box about"[^>]*><p>([\s\S]*?)<\/p>/);
    let about = aboutMatch ? aboutMatch[1].replace(/<[^>]+>/g,'').trim().slice(0,220) : '';
    if(about.length===220) about+='...';
    // Extract website link
    const websiteMatch = html.match(/<a href="(https?:\/\/[^"]+)"[^>]*>\s*<i class="icon-link"><\/i>/);
    const website = websiteMatch ? websiteMatch[1] : (sym==='RELIANCE' ? 'http://www.ril.com' : null);
    const wikiSlug = WIKI_MAP[sym] || sym.replace(/[^A-Z0-9]/g,'_');
    const wikipedia = `https://en.wikipedia.org/wiki/${wikiSlug}`;
    const bseLink = `https://www.bseindia.com/stock-share-price/${encodeURIComponent(name.toLowerCase().replace(/\s+/g,'-'))}/${sym}/`;
    const nseLink = `https://www.nseindia.com/get-quotes/equity?symbol=${sym}`;
    const screenerLink = `https://www.screener.in/company/${sym}/`;
    const moneycontrolSlug = sym.toLowerCase();
    const moneycontrolLink = `https://www.moneycontrol.com/india/stockpricequote/${moneycontrolSlug}`;
    const tradingviewLink = `https://www.tradingview.com/symbols/NSE-${sym}/`;

    const info = {
      symbol: sym, name, about, website, wikipedia,
      links: {
        wikipedia, website, bse: bseLink, nse: nseLink,
        screener: screenerLink, moneycontrol: moneycontrolLink, tradingview: tradingviewLink
      },
      credibleSources: ['Wikipedia', 'Screener.in', 'NSE India', 'BSE India', 'MoneyControl', 'TradingView', website ? 'Official Website' : null].filter(Boolean),
      source: 'screener.in + wikipedia + credible sources'
    };
    cache.set(key, info);
    return info;
  }catch(e){
    const wikiSlug = WIKI_MAP[sym] || sym;
    const wikipedia = `https://en.wikipedia.org/wiki/${wikiSlug}`;
    return {
      symbol: sym, name: `${sym} Ltd`, about: '', website: null, wikipedia,
      links: {
        wikipedia,
        nse: `https://www.nseindia.com/get-quotes/equity?symbol=${sym}`,
        bse: `https://www.bseindia.com/stock-share-price/${sym}/`,
        screener: `https://www.screener.in/company/${sym}/`,
        tradingview: `https://www.tradingview.com/symbols/NSE-${sym}/`
      },
      credibleSources: ['Wikipedia','NSE India','BSE India','Screener.in','TradingView'],
      source: 'fallback'
    };
  }
}
export default { getCompanyInfo };
