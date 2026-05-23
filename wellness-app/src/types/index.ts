export interface Meal {
  id: string;
  timestamp: string;
  imageDataUrl: string;
  description: string;
  calories: number;
  items: { name: string; calories: number }[];
  notes: string;
}

export interface WaterEntry {
  id: string;
  timestamp: string;
  imageDataUrl?: string;
  amount: number; // ml
  label: string;
}

export interface DayData {
  date: string;
  meals: Meal[];
  waterEntries: WaterEntry[];
  gratitude: string;
  meditationMinutes: number;
  weight: number | null;
  cardio: boolean | null;
  stretched: boolean | null;
  resistance: boolean | null;
}

export const CALORIE_GOAL = 2000;
export const WATER_GOAL_ML = 2000; // 8 × 250ml glasses
export const WATER_GLASS_ML = 250;
