function esc(v){
  return String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
const num = (v, d = 0) => (v === null || v === undefined || v === '' || isNaN(v)) ? '-' : Number(v).toFixed(d)

function stockTable(title, color, list){
  const rows = (list || []).map((s, i) => {
    const detail = [s.summary ? `<b>Why:</b> ${esc(s.summary).slice(0, 220)}` : '', (s.pros || []).length ? `<span style="color:#047857">✓ ${esc((s.pros || []).slice(0, 3).join(' • '))}</span>` : '', (s.cons || []).length ? `<span style="color:#b91c1c">✕ ${esc((s.cons || []).slice(0, 2).join(' • '))}</span>` : ''].filter(Boolean).join(' &nbsp; ')
    return `<tr>
      <td style="text-align:right">${i + 1}</td>
      <td><b>${esc(s.symbol)}</b><div style="color:#6b7280;font-size:11px">${esc(s.verdict || '')} • Score ${num(s.score)}/100</div></td>
      <td style="text-align:right">₹${num(s.price)}</td>
      <td style="text-align:right;color:#1d4ed8">₹${num(s.target)}</td>
      <td style="text-align:right;color:${(s.upside ?? 0) >= 0 ? '#047857' : '#b91c1c'}">${(s.upside ?? 0) >= 0 ? '+' : ''}${num(s.upside, 1)}%</td>
      <td style="text-align:right">${s.pe ?? '-'}</td>
      <td style="text-align:right">${s.roe ?? '-'}%</td>
      <td style="text-align:right">${num(s.rsi, 1)}</td>
    </tr>${detail ? `<tr><td colspan="8" style="background:#f9fafb;color:#374151;font-size:11px;line-height:1.5">${detail}</td></tr>` : ''}`
  }).join('')
  if (!rows) return ''
  return `<h3 style="color:${color};font-size:15px;margin:18px 0 6px">${esc(title)} — ${(list || []).length} Stocks</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#f3f4f6;color:#6b7280;font-size:11px">
        <th style="text-align:right;padding:6px">#</th>
        <th style="text-align:left;padding:6px">Stock</th>
        <th style="text-align:right;padding:6px">Price</th>
        <th style="text-align:right;padding:6px">Target 12M</th>
        <th style="text-align:right;padding:6px">Upside</th>
        <th style="text-align:right;padding:6px">P/E</th>
        <th style="text-align:right;padding:6px">ROE</th>
        <th style="text-align:right;padding:6px">RSI</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`
}

function indicesTable(indices){
  if (!indices || !indices.length) return ''
  return `<h3 style="color:#111827;font-size:15px;margin:18px 0 6px">📈 Market Indices</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#f3f4f6;color:#6b7280;font-size:11px"><th style="text-align:left;padding:6px">Index</th><th style="text-align:right;padding:6px">Price</th><th style="text-align:right;padding:6px">Change</th></tr></thead>
      <tbody>${indices.map(idx => `<tr>
        <td style="padding:6px;font-weight:bold">${esc(idx.name)}</td>
        <td style="padding:6px;text-align:right">${num(idx.price, 2)}</td>
        <td style="padding:6px;text-align:right;color:${(idx.change ?? 0) >= 0 ? '#047857' : '#b91c1c'}">${(idx.change ?? 0) >= 0 ? '+' : ''}${num(idx.change, 2)} (${num(idx.changePercent, 2)}%)</td>
      </tr>`).join('')}</tbody>
    </table>`
}

function buildHtml(data, indices){
  const stamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  const scanned = data.scanned || data.totalScanned || 2000
  return `
    <div style="border-bottom:2px solid #1d4ed8;padding-bottom:10px;margin-bottom:6px">
      <h1 style="color:#1d4ed8;font-size:22px;margin:0">Indian Stock Analyzer — AI Portfolio</h1>
      <p style="color:#6b7280;font-size:12px;margin:4px 0 0">Top 30 picks from a deep scan of ${esc(scanned)} NSE stocks • ${esc(stamp)} IST • Not SEBI advice</p>
    </div>
    ${indicesTable(indices)}
    <p style="color:#374151;font-size:12px;margin:14px 0 0">AI portfolio — <b>Top 30</b> (10 Steady / 10 Mid / 10 Aggressive). Each pick shows price, 12M target, upside, valuation and risk metrics.</p>
    ${stockTable('🟢 Steady Growth', '#047857', data.steady)}
    ${stockTable('🟡 Mid Growth', '#b45309', data.mid)}
    ${stockTable('🔴 Aggressive Growth', '#b91c1c', data.aggressive)}
    <p style="color:#9ca3af;font-size:10px;margin-top:18px;border-top:1px solid #e5e7eb;padding-top:8px">Sources: Yahoo Finance • Screener.in • NSE India • Broker consensus • Generated ${esc(stamp)} IST • Not SEBI registered — for education only.</p>
  `
}

// Builds the portfolio as a real one-click .pdf download (A4, multi-page).
export async function downloadPortfolioPdf(data, { indices = [], fileName } = {}){
  if (!data) throw new Error('No portfolio data to export')
  // Lazy-load heavy PDF libs only when the user actually exports (keeps initial bundle small)
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas')
  ])
  const node = document.createElement('div')
  node.style.cssText = 'position:fixed;left:-10000px;top:0;width:820px;background:#ffffff;color:#111827;font-family:Arial,Helvetica,sans-serif;padding:28px;box-sizing:border-box;z-index:-1'
  node.innerHTML = buildHtml(data, indices)
  document.body.appendChild(node)
  try{
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgW = pageW
    const imgH = canvas.height * imgW / canvas.width
    const imgData = canvas.toDataURL('image/jpeg', 0.92)

    let heightLeft = imgH
    let position = 0
    pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH)
    heightLeft -= pageH
    while (heightLeft > 0){
      position -= pageH
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH)
      heightLeft -= pageH
    }
    pdf.save(fileName || `AI-Portfolio-${new Date().toISOString().slice(0, 10)}.pdf`)
  } finally {
    document.body.removeChild(node)
  }
}

export default downloadPortfolioPdf
