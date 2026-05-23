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
  // Anthropic only supports jpeg, png, gif, webp
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(type)
    ? type
    : 'image/jpeg';
}

function extractBase64(dataUrl: string): string {
  return dataUrl.split(',')[1] ?? '';
}

export async function analyzeMeal(imageDataUrl: string): Promise<MealAnalysis> {
  const res = await fetch('/api/analyze-meal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: extractBase64(imageDataUrl),
      mimeType: extractMimeType(imageDataUrl),
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
      mimeType: extractMimeType(imageDataUrl),
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
    // No capture attr so iOS gives "Take Photo" + "Photo Library" options

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
