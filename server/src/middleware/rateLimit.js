import rateLimit from 'express-rate-limit'

// Requires app.set('trust proxy', 1) so req.ip is the real client behind Render's proxy.
function mk(windowMs, limit, text){
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: text }
  })
}

// Global API shield — also protects the Yahoo-backed routes from a single hot client.
export const apiLimiter = mk(60 * 1000, 120, 'Too many requests — please slow down.')
export const heavyLimiter = mk(60 * 1000, 40, 'Too many requests — please slow down.')

// Newsletter subscribe — 3/hour and 10/day per IP.
export const subscribeLimits = [
  mk(60 * 60 * 1000, 3, 'Too many subscribe attempts this hour. Please try again later.'),
  mk(24 * 60 * 60 * 1000, 10, 'Too many subscribe attempts today. Please try again tomorrow.')
]

// On-demand portfolio email — 2/hour and 5/day per IP (plus per-address dedup in the route).
export const sendPortfolioLimits = [
  mk(60 * 60 * 1000, 2, 'You can request the portfolio email twice per hour. Please try again later.'),
  mk(24 * 60 * 60 * 1000, 5, 'Daily email-request limit reached. Please try again tomorrow.')
]

// Unsubscribe is benign — keep it lenient but not unlimited.
export const unsubscribeLimits = [
  mk(60 * 60 * 1000, 20, 'Too many requests. Please try again later.')
]

export default { apiLimiter, heavyLimiter, subscribeLimits, sendPortfolioLimits, unsubscribeLimits }
