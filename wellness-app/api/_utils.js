/**
 * Shared guards for Vercel API functions.
 * Files starting with _ are NOT treated as serverless routes by Vercel.
 */

// ── Shared-secret auth ────────────────────────────────────────────
// If API_SECRET env var is set, every request must include the matching
// X-App-Token header. Safe to leave unset for local dev.
export function checkAuth(req, res) {
  const secret = process.env.API_SECRET;
  if (!secret) return true; // not configured — allow (dev fallback)
  if (req.headers['x-app-token'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// ── IP rate limiter ───────────────────────────────────────────────
// Simple sliding-window counter per IP, stored in module-level memory.
// Not perfect across multiple Vercel instances, but stops the vast
// majority of abuse on a lightly-trafficked personal app.
const ipMap = new Map(); // ip -> number[]  (timestamps of recent hits)

export function checkRateLimit(req, res, maxHits = 20, windowMs = 60_000) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0] : null)?.trim()
    ?? req.socket?.remoteAddress
    ?? 'unknown';

  const now = Date.now();
  const hits = (ipMap.get(ip) ?? []).filter(t => now - t < windowMs);

  if (hits.length >= maxHits) {
    res.status(429).json({ error: 'Too many requests — please slow down and try again in a minute.' });
    return false;
  }

  hits.push(now);
  ipMap.set(ip, hits);

  // Occasionally prune stale entries so the Map doesn't grow forever
  if (ipMap.size > 5_000) {
    for (const [k, v] of ipMap) {
      if (v.every(t => now - t > windowMs)) ipMap.delete(k);
    }
  }

  return true;
}
