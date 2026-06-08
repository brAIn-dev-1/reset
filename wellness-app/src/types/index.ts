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
  weight: number | null;
  /** Legacy fields kept optional for backward compatibility with old localStorage
   *  data from the now-removed Mind/Community tabs and Body-tab activity check-in. */
  gratitude?: string;
  meditationMinutes?: number;
  cardio?: boolean | null;
  stretched?: boolean | null;
  resistance?: boolean | null;
  connection?: boolean | null;
  helpedSomeone?: boolean | null;
  volunteered?: boolean | null;
}

export const CALORIE_GOAL = 2000;
export const WATER_GOAL_ML = 2000; // 8 × 250ml glasses
export const WATER_GLASS_ML = 250;
