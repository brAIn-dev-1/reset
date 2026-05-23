export default function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  const hasKey = !!key;
  const keyPreview = hasKey ? `${key.slice(0, 14)}...` : 'NOT SET';

  console.log('[health] ANTHROPIC_API_KEY present:', hasKey);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: hasKey,
    key: keyPreview,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
