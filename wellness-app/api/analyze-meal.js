import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
  maxDuration: 30, // seconds — upgrade from the 10s default
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in environment variables' });

  const { imageBase64, mimeType = 'image/jpeg' } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  const safeType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)
    ? mimeType
    : 'image/jpeg';

  try {
    const anthropic = new Anthropic({ apiKey: key });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: safeType, data: imageBase64 } },
          {
            type: 'text',
            text: `Analyze this meal photo. A human hand is visible for scale — use it to accurately estimate portion sizes.

Return ONLY a valid JSON object with these fields:
{
  "calories": <total estimated calories as a number>,
  "description": "<brief meal description>",
  "items": [{"name": "<food item>", "calories": <number>}],
  "notes": "<one sentence about your estimate confidence>"
}

No markdown, just raw JSON.`,
          },
        ],
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('Meal analysis error:', err?.message ?? err);
    res.status(500).json({ error: err?.message ?? 'Failed to analyze meal' });
  }
}
