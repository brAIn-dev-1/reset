import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '25mb' }));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/analyze-meal', async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg' } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `Analyze this meal photo. A human hand is visible for scale — use it to accurately estimate portion sizes.

Return ONLY a valid JSON object with these fields:
{
  "calories": <total estimated calories as a number>,
  "description": "<brief meal description, e.g. 'Chicken rice bowl with vegetables'>",
  "items": [{"name": "<food item>", "calories": <number>}],
  "notes": "<one sentence about your estimate confidence>"
}

Be practical. If uncertain, estimate conservatively. No markdown, just raw JSON.`,
          },
        ],
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('Meal analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze meal' });
  }
});

app.post('/api/analyze-water', async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg' } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
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
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Wellspace server running on http://0.0.0.0:${PORT}`);
});
