// middleware/autocompleteRateLimiter.mjs
// Token bucket rate limiter для /api/autocomplete
// Limit: 10 rps per IP

const buckets = new Map(); // IP -> { tokens, lastRefill }
const MAX_TOKENS = 10;
const REFILL_RATE = 10; // tokens per second
const REFILL_INTERVAL = 1000; // ms

/**
 * Rate limiter middleware
 */
export function autocompleteRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || '0.0.0.0';
  const now = Date.now();
  
  let bucket = buckets.get(ip);
  
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    buckets.set(ip, bucket);
  }
  
  // Refill tokens
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= REFILL_INTERVAL) {
    const intervals = Math.floor(elapsed / REFILL_INTERVAL);
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + intervals * REFILL_RATE);
    bucket.lastRefill = now;
  }
  
  // Check if token available
  if (bucket.tokens < 1) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }
  
  // Consume token
  bucket.tokens--;
  
  next();
}

// Cleanup old buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > 5 * 60 * 1000) {
      buckets.delete(ip);
    }
  }
}, 5 * 60 * 1000);
