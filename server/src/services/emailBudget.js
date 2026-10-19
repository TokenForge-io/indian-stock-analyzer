import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BUDGET_FILE = path.join(__dirname, '../data/emailBudget.json')

// Hard ceiling on real emails sent per calendar month (EmailJS free = 200/mo).
// Kept below 200 so the last legit sends never silently fail mid-blast.
const MAX_MONTHLY = Number(process.env.MAX_MONTHLY_EMAILS || 180)

function monthKey(){
  try{
    const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    return `${ist.getFullYear()}-${String(ist.getMonth()+1).padStart(2,'0')}`
  }catch{
    const d = new Date()
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`
  }
}

function ensureFile(){
  try{
    const dir = path.dirname(BUDGET_FILE)
    if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }catch{}
}

function load(){
  try{
    ensureFile()
    const raw = fs.existsSync(BUDGET_FILE) ? JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf-8')) : null
    const month = monthKey()
    if(!raw || raw.month !== month) return { month, used: 0 }
    return { month, used: Number(raw.used) || 0 }
  }catch{
    return { month: monthKey(), used: 0 }
  }
}

function save(b){
  try{ fs.writeFileSync(BUDGET_FILE, JSON.stringify(b, null, 2)) }catch{}
}

export function getMax(){ return MAX_MONTHLY }

export function getUsage(){
  const b = load()
  return { month: b.month, used: b.used, max: MAX_MONTHLY, remaining: Math.max(0, MAX_MONTHLY - b.used) }
}

export function canSend(){
  const b = load()
  return b.used < MAX_MONTHLY
}

export function record(n = 1){
  const b = load()
  b.used += n
  b.month = monthKey()
  save(b)
  return getUsage()
}

export default { getMax, getUsage, canSend, record }
