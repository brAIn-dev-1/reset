export default function handler(req, res) {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const keyPreview = hasKey
    ? `${process.env.ANTHROPIC_API_KEY.slice(0, 10)}...`
    : 'NOT SET';
  res.json({
    ok: hasKey,
    key: keyPreview,
    timestamp: new Date().toISOString(),
  });
}
