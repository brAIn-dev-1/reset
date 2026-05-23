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
 * Resize the photo to max 1200px and re-encode at 85% quality before
 * sending to the Claude API. The original and resized image are both
 * discarded after the API call — nothing is saved to localStorage.
 */
export function resizeForApi(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 1200;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
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
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
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
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

export function capturePhoto(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    // iOS Safari requires the input to be in the DOM before .click() is called,
    // otherwise the first tap is silently swallowed.
    input.style.cssText = 'position:fixed;top:-200px;left:-200px;opacity:0;';
    document.body.appendChild(input);

    const cleanup = () => { input.parentNode?.removeChild(input); };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      cleanup();
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    input.addEventListener('cancel', () => {
      cleanup();
      reject(new Error('No file selected'));
    });

    input.click();
  });
}
