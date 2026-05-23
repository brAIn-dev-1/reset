interface MealAnalysis {
  calories: number;
  description: string;
  items: { name: string; calories: number }[];
  notes: string;
}

interface WaterAnalysis {
  amount: number;
  label: string;
  confidence: string;
}

function extractMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const type = match?.[1] ?? 'image/jpeg';
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(type)
    ? type
    : 'image/jpeg';
}

function extractBase64(dataUrl: string): string {
  return dataUrl.split(',')[1] ?? '';
}

/**
 * Resize + re-encode a photo to a thumbnail for localStorage (~20-40 KB)
 * and a full-quality version for the API call (~300 KB).
 * iPhone photos can be 5-10 MB; we compress aggressively for storage.
 */
export function processPhoto(dataUrl: string): Promise<{ forStorage: string; forApi: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // --- thumbnail for localStorage (max 400px wide, quality 0.6) ---
      const thumbCanvas = document.createElement('canvas');
      const thumbMax = 400;
      const thumbScale = Math.min(1, thumbMax / Math.max(img.width, img.height));
      thumbCanvas.width  = Math.round(img.width  * thumbScale);
      thumbCanvas.height = Math.round(img.height * thumbScale);
      thumbCanvas.getContext('2d')!.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const forStorage = thumbCanvas.toDataURL('image/jpeg', 0.6);

      // --- API copy (max 1200px wide, quality 0.85) — good enough for Claude ---
      const apiCanvas = document.createElement('canvas');
      const apiMax = 1200;
      const apiScale = Math.min(1, apiMax / Math.max(img.width, img.height));
      apiCanvas.width  = Math.round(img.width  * apiScale);
      apiCanvas.height = Math.round(img.height * apiScale);
      apiCanvas.getContext('2d')!.drawImage(img, 0, 0, apiCanvas.width, apiCanvas.height);
      const forApi = apiCanvas.toDataURL('image/jpeg', 0.85);

      resolve({ forStorage, forApi });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function analyzeMeal(imageDataUrl: string): Promise<MealAnalysis> {
  const res = await fetch('/api/analyze-meal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: extractBase64(imageDataUrl),
      mimeType: 'image/jpeg',
    }),
  });
  if (!res.ok) throw new Error('Meal analysis failed');
  return res.json();
}

export async function analyzeWater(imageDataUrl: string): Promise<WaterAnalysis> {
  const res = await fetch('/api/analyze-water', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: extractBase64(imageDataUrl),
      mimeType: 'image/jpeg',
    }),
  });
  if (!res.ok) throw new Error('Water analysis failed');
  return res.json();
}

export function capturePhoto(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    input.click();
  });
}
