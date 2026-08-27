// Technical Indicators - no external TA-lib needed (pure JS)
export function sma(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) result.push(null);
    else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

export function ema(data, period) {
  const k = 2 / (period + 1);
  const result = [];
  let emaPrev = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) result.push(null);
    else if (i === period - 1) result.push(emaPrev);
    else {
      emaPrev = data[i] * k + emaPrev * (1 - k);
      result.push(emaPrev);
    }
  }
  return result;
}

export function rsi(closes, period = 14) {
  const result = Array(closes.length).fill(null);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  return result;
}

export function macd(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = closes.map((_, i) => (emaFast[i] != null && emaSlow[i] != null) ? emaFast[i] - emaSlow[i] : null);
  const validMacd = macdLine.filter(v => v != null);
  const signalLineRaw = ema(validMacd, signal);
  // pad signalLine to align
  const signalLine = Array(closes.length).fill(null);
  let idx = signalLineRaw.findIndex(v => v != null);
  let rawIdx = 0;
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] != null) {
      if (rawIdx >= idx && signalLineRaw[rawIdx] != null) signalLine[i] = signalLineRaw[rawIdx];
      rawIdx++;
    }
  }
  const histogram = macdLine.map((v, i) => (v != null && signalLine[i] != null) ? v - signalLine[i] : null);
  return { macdLine, signalLine, histogram };
}

export function bollingerBands(closes, period = 20, stdDev = 2) {
  const middle = sma(closes, period);
  const upper = [];
  const lower = [];
  for (let i = 0; i < closes.length; i++) {
    if (middle[i] == null) { upper.push(null); lower.push(null); }
    else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }
  return { upper, middle, lower };
}

export function analyzeIndicators(closes) {
  const rsiVals = rsi(closes);
  const lastRsi = rsiVals.filter(v => v != null).slice(-1)[0] || 50;
  const sma20Vals = sma(closes, 20);
  const sma50Vals = sma(closes, 50);
  const sma200Vals = sma(closes, 200);
  const sma20 = sma20Vals.filter(v => v != null).slice(-1)[0] || closes[closes.length-1];
  const sma50 = sma50Vals.filter(v => v != null).slice(-1)[0] || sma20;
  const sma200 = sma200Vals.filter(v => v != null).slice(-1)[0] || sma50;
  const price = closes[closes.length - 1];
  const prevClose = closes[closes.length-2] || price;
  const changePct = ((price - prevClose)/prevClose)*100;

  const macdVals = macd(closes);
  const lastMacd = macdVals.macdLine.filter(v=>v!=null).slice(-1)[0] || 0;
  const lastSignal = macdVals.signalLine.filter(v=>v!=null).slice(-1)[0] || 0;
  const bb = bollingerBands(closes);
  const lastUpper = bb.upper.filter(v=>v!=null).slice(-1)[0] || price*1.05;
  const lastLower = bb.lower.filter(v=>v!=null).slice(-1)[0] || price*0.95;

  let signal = "HOLD";
  let reasons = [];
  let score = 0;

  // RSI nuanced — aligned with AI (55-70 is healthy momentum, not sell)
  if (lastRsi < 28) { signal = "BUY"; reasons.push(`RSI deeply oversold (${lastRsi.toFixed(1)}) — reversal likely`); score+=2; }
  else if (lastRsi < 35) { reasons.push(`RSI oversold (${lastRsi.toFixed(1)})`); score+=1; if(signal==="HOLD") signal="BUY"; }
  else if (lastRsi > 75) { signal = "SELL"; reasons.push(`RSI deeply overbought (${lastRsi.toFixed(1)}) — pullback risk`); score-=2; }
  else if (lastRsi > 70) { reasons.push(`RSI overbought (${lastRsi.toFixed(1)})`); score-=0.7; }
  else if (lastRsi >= 45 && lastRsi <= 68) { reasons.push(`RSI neutral-strong (${lastRsi.toFixed(1)})`); score+=0.7; }
  else { reasons.push(`RSI neutral (${lastRsi.toFixed(1)})`); }

  // SMA trend - always give a reason
  if (price > sma20 && sma20 > sma50 && sma50 > sma200) { reasons.push(`Strong uptrend: price > SMA20 > SMA50 > SMA200`); score+=2; if(signal==="HOLD") signal="BUY"; }
  else if (price > sma20 && sma20 > sma50) { reasons.push(`Uptrend: price above SMA20 > SMA50`); score+=1; }
  else if (price < sma20 && sma20 < sma50 && sma50 < sma200) { reasons.push(`Strong downtrend: price < SMA20 < SMA50 < SMA200`); score-=2; if(signal==="HOLD") signal="SELL"; }
  else if (price < sma20 && sma20 < sma50) { reasons.push(`Downtrend: price below SMA20 < SMA50`); score-=1; }
  else if (price > sma20 && price < sma50) { reasons.push(`Consolidation: price between SMA20 (${sma20.toFixed(0)}) & SMA50 (${sma50.toFixed(0)})`); }
  else if (price < sma20 && price > sma50) { reasons.push(`Mixed: price below SMA20 but above SMA50`); }
  else { reasons.push(`Price near SMA20 (${sma20.toFixed(0)})`); }

  // MACD
  if (lastMacd > lastSignal && lastMacd > 0) { reasons.push(`MACD bullish (MACD ${lastMacd.toFixed(2)} > Signal ${lastSignal.toFixed(2)})`); score+=1; }
  else if (lastMacd > lastSignal) { reasons.push(`MACD turning bullish`); score+=0.5; }
  else if (lastMacd < lastSignal) { reasons.push(`MACD bearish (${lastMacd.toFixed(2)} < ${lastSignal.toFixed(2)})`); score-=0.5; }

  // Bollinger
  if (price > lastUpper) { reasons.push(`Above Bollinger upper band — overextended`); score-=1; }
  else if (price < lastLower) { reasons.push(`Below Bollinger lower band — oversold bounce zone`); score+=1; }
  else { reasons.push(`Within Bollinger bands`); }

  // Momentum
  if (changePct > 2) { reasons.push(`Strong momentum +${changePct.toFixed(1)}% today`); score+=0.5; }
  else if (changePct < -2) { reasons.push(`Weak momentum ${changePct.toFixed(1)}% today`); score-=0.5; }

  // Final signal refinement based on score if still HOLD
  if(signal==="HOLD"){
    if(score >= 2) signal="BUY";
    else if(score <= -2) signal="SELL";
  }

  // Ensure at least 3 reasons and varied
  reasons = [...new Set(reasons)].slice(0,5);

  return { rsi: lastRsi, sma20, sma50, sma200, macd: lastMacd, signalLine: lastSignal, bbUpper: lastUpper, bbLower: lastLower, price, signal, reasons, score };
}
