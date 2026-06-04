import { useState, useEffect, useRef, useCallback } from 'react';
import type { DayData, Meal, WaterEntry } from '../types';

// ── Local-date helper ─────────────────────────────────────────────
// IMPORTANT: never use toISOString() for the current date — it returns the
// UTC date, which is already "tomorrow" for US time zones after ~5–8 PM.
function localDateStr(d: Date = new Date()): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

const today = () => localDateStr(new Date());

// ── Date-keyed localStorage helpers ──────────────────────────────
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

// ── Main hook ─────────────────────────────────────────────────────
export function useDailyData(dateOverride?: string) {
  // Track which calendar day is currently loaded so we can detect roll-overs.
  // A ref (not state) so the visibilitychange callback always reads the
  // current value without needing to be re-registered.
  const loadedDate = useRef(dateOverride ?? today());

  const [data, setData] = useState<DayData>(() => loadDay(loadedDate.current));

  // Re-load whenever the app comes back to the foreground.
  // This handles two failure modes:
  //   1. App left open overnight — the hook captured yesterday's date at mount
  //      time and would keep writing to the wrong key all morning.
  //   2. iOS PWA re-foregrounded after OS killed the process — the hook needs
  //      to confirm it's still on the right day before accepting input.
  useEffect(() => {
    if (dateOverride) return; // caller is managing an explicit date — leave it alone

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const newDate = today();
      if (newDate !== loadedDate.current) {
        loadedDate.current = newDate;
        setData(loadDay(newDate));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [dateOverride]);

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

// ── Read-only helpers ─────────────────────────────────────────────

/** All stored days, newest-first. Skips non-date keys (e.g. target_weight). */
export function getAllDays(): DayData[] {
  return Object.keys(localStorage)
    .filter(k => k.startsWith('wellspace_'))
    .map(k => k.replace('wellspace_', ''))
    .filter(d => DATE_RE.test(d))          // ← drop target_weight and any junk
    .sort()
    .reverse()
    .map(date => loadDay(date));
}

/** Exactly 14 entries (oldest → newest) aligned to the last 14 LOCAL calendar
 *  days. Days with no stored entry are null.
 *  index 0 = 13 days ago, index 13 = today, index 12 = yesterday. */
export function getLast14DatesData(): (DayData | null)[] {
  const dayMap = new Map<string, DayData>();
  Object.keys(localStorage)
    .filter(k => k.startsWith('wellspace_'))
    .forEach(k => {
      const date = k.replace('wellspace_', '');
      if (!DATE_RE.test(date)) return;      // ← skip non-date keys
      try { dayMap.set(date, JSON.parse(localStorage.getItem(k)!)); } catch { /* skip */ }
    });

  const result: (DayData | null)[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDateStr(d);            // ← local date, not UTC
    result.push(dayMap.get(key) ?? null);
  }
  return result;
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
