import { useState, useCallback } from 'react';
import type { DayData, Meal, WaterEntry } from '../types';

const today = () => new Date().toISOString().split('T')[0];

const DEFAULT_DAY = (date: string): DayData => ({
  date,
  meals: [],
  waterEntries: [],
  gratitude: '',
  meditationMinutes: 0,
  weight: null,
  cardio: null,
  stretched: null,
  resistance: null,
  connection: null,
  helpedSomeone: null,
  volunteered: null,
});

function loadDay(date: string): DayData {
  try {
    const raw = localStorage.getItem(`wellspace_${date}`);
    return raw ? JSON.parse(raw) : DEFAULT_DAY(date);
  } catch {
    return DEFAULT_DAY(date);
  }
}

function saveDay(data: DayData) {
  localStorage.setItem(`wellspace_${data.date}`, JSON.stringify(data));
}

export function useDailyData(date: string = today()) {
  const [data, setData] = useState<DayData>(() => loadDay(date));

  const update = useCallback((updates: Partial<DayData>) => {
    setData(prev => {
      const next = { ...prev, ...updates };
      saveDay(next);
      return next;
    });
  }, []);

  const addMeal = useCallback((meal: Meal) => {
    setData(prev => {
      const next = { ...prev, meals: [...prev.meals, meal] };
      saveDay(next);
      return next;
    });
  }, []);

  const removeMeal = useCallback((id: string) => {
    setData(prev => {
      const next = { ...prev, meals: prev.meals.filter(m => m.id !== id) };
      saveDay(next);
      return next;
    });
  }, []);

  const addWater = useCallback((entry: WaterEntry) => {
    setData(prev => {
      const next = { ...prev, waterEntries: [...prev.waterEntries, entry] };
      saveDay(next);
      return next;
    });
  }, []);

  const removeWater = useCallback((id: string) => {
    setData(prev => {
      const next = { ...prev, waterEntries: prev.waterEntries.filter(w => w.id !== id) };
      saveDay(next);
      return next;
    });
  }, []);

  const addMeditationMinutes = useCallback((minutes: number) => {
    setData(prev => {
      const next = { ...prev, meditationMinutes: prev.meditationMinutes + minutes };
      saveDay(next);
      return next;
    });
  }, []);

  return {
    data,
    update,
    addMeal,
    removeMeal,
    addWater,
    removeWater,
    addMeditationMinutes,
  };
}

export function getAllDays(): DayData[] {
  return Object.keys(localStorage)
    .filter(k => k.startsWith('wellspace_'))
    .map(k => k.replace('wellspace_', ''))
    .sort()
    .reverse()
    .map(date => loadDay(date));
}

/** Returns exactly 14 entries (oldest → newest) aligned to the last 14 calendar days.
 *  Days with no localStorage entry are null. */
export function getLast14DatesData(): (DayData | null)[] {
  const dayMap = new Map<string, DayData>();
  Object.keys(localStorage)
    .filter(k => k.startsWith('wellspace_'))
    .forEach(k => {
      const date = k.replace('wellspace_', '');
      try { dayMap.set(date, JSON.parse(localStorage.getItem(k)!)); } catch { /* skip */ }
    });

  const result: (DayData | null)[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push(dayMap.get(key) ?? null);
  }
  return result; // index 0 = 13 days ago, index 13 = today
}

// ── Target weight ────────────────────────────────────────────────
const TW_KEY = 'wellspace_target_weight';

export function getTargetWeight(): number | null {
  const v = localStorage.getItem(TW_KEY);
  return v ? parseFloat(v) : null;
}

export function saveTargetWeight(w: number): void {
  localStorage.setItem(TW_KEY, String(w));
}

// ── Streak helpers ───────────────────────────────────────────────
/** Days sorted newest-first. Skips null (not logged) days, breaks on false. */
export function calcStreak(
  allDays: DayData[],
  field: 'cardio' | 'stretched' | 'resistance' | 'connection' | 'helpedSomeone' | 'volunteered',
): number {
  let streak = 0;
  for (const d of allDays) {
    if (d[field] === true) streak++;
    else if (d[field] === false) break;
    // null = never opened app that day → don't break, don't count
  }
  return streak;
}
