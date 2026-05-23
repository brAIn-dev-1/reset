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
