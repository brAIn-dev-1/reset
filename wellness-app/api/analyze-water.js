import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mimeType = 'image/jpeg' } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  const safeType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)
    ? mimeType
    : 'image/jpeg';

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: safeType, data: imageBase64 } },
          {
            type: 'text',
            text: `Estimate the amount of water/liquid in this container based on its size and fill level.

Return ONLY a valid JSON object:
{
  "amount": <milliliters as a number>,
  "label": "<e.g. 'Large water bottle (full)' or 'Standard glass (half full)'>",
  "confidence": "<low|medium|high>"
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
    console.error('Water analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze water' });
  }
}
