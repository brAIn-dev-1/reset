import Anthropic from '@anthropic-ai/sdk';
import { checkAuth, checkRateLimit } from './_utils.js';

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
  maxDuration: 30,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req, res)) return;
  if (!checkRateLimit(req, res)) return;

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in environment variables' });

  const { description } = req.body ?? {};
  if (!description?.trim()) return res.status(400).json({ error: 'No description provided' });

  try {
    const anthropic = new Anthropic({ apiKey: key });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Estimate the calories for this meal: "${description.trim()}"

Use standard portion sizes if quantities aren't specified. Return ONLY a valid JSON object:
{
  "calories": <total estimated calories as a number>,
  "description": "<clean, concise meal description>",
  "items": [{"name": "<food item with portion>", "calories": <number>}],
  "notes": "<one brief sentence about the estimate>"
}

No markdown, no explanation, just raw JSON.`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('Text meal analysis error:', err?.message ?? err);
    res.status(500).json({ error: err?.message ?? 'Failed to analyze meal' });
  }
}
