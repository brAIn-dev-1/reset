import { useState, useRef } from 'react';
import { Camera, Droplets, Plus, Trash2, ChevronDown, ChevronUp, Loader2, UtensilsCrossed, PencilLine } from 'lucide-react';
import { useDailyData } from '../hooks/useDailyData';
import { analyzeMeal, analyzeMealFromText, analyzeWater, capturePhoto, resizeForApi } from '../api/client';
import ProgressBar from '../components/ProgressBar';
import type { Meal, WaterEntry } from '../types';
import { CALORIE_GOAL, WATER_GOAL_ML, WATER_GLASS_ML } from '../types';

const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const uid = () => Math.random().toString(36).slice(2);

const QUICK_WATER = [
  { label: 'Small glass', amount: 200 },
  { label: 'Glass', amount: 250 },
  { label: 'Large glass', amount: 350 },
  { label: 'Bottle (500ml)', amount: 500 },
  { label: 'Bottle (1L)', amount: 1000 },
];

export default function NutritionPage() {
  const { data, addMeal, removeMeal, addWater, removeWater } = useDailyData();
  const [analyzingMeal, setAnalyzingMeal] = useState(false);
  const [analyzingTextMeal, setAnalyzingTextMeal] = useState(false);
  const [analyzingWater, setAnalyzingWater] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [mealError, setMealError] = useState('');
  const [waterError, setWaterError] = useState('');
  const [showQuickWater, setShowQuickWater] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const totalCalories = data.meals.reduce((s, m) => s + m.calories, 0);
  const totalWaterMl = data.waterEntries.reduce((s, w) => s + w.amount, 0);
  const waterGlasses = Math.round((totalWaterMl / WATER_GLASS_ML) * 10) / 10;
  const goalGlasses = WATER_GOAL_ML / WATER_GLASS_ML;

  const handleAddMeal = async () => {
    setMealError('');
    setShowTextInput(false);
    try {
      const raw = await capturePhoto();
      setAnalyzingMeal(true);
      const apiImage = await resizeForApi(raw);
      const result = await analyzeMeal(apiImage);
      const meal: Meal = {
        id: uid(),
        timestamp: new Date().toISOString(),
        imageDataUrl: '',
        description: result.description,
        calories: result.calories,
        items: result.items ?? [],
        notes: result.notes ?? '',
      };
      addMeal(meal);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg !== 'No file selected') {
        console.error('Meal analysis error:', msg);
        setMealError(`Analysis failed: ${msg}`);
      }
    } finally {
      setAnalyzingMeal(false);
    }
  };

  const handleAddMealFromText = async () => {
    const desc = textInput.trim();
    if (!desc) return;
    setMealError('');
    try {
      setAnalyzingTextMeal(true);
      const result = await analyzeMealFromText(desc);
      const meal: Meal = {
        id: uid(),
        timestamp: new Date().toISOString(),
        imageDataUrl: '',
        description: result.description,
        calories: result.calories,
        items: result.items ?? [],
        notes: result.notes ?? '',
      };
      addMeal(meal);
      setShowTextInput(false);
      setTextInput('');
    } catch (err) {
      const msg = (err as Error).message;
      console.error('Text meal analysis error:', msg);
      setMealError(`Analysis failed: ${msg}`);
    } finally {
      setAnalyzingTextMeal(false);
    }
  };

  const openTextInput = () => {
    setMealError('');
    setShowTextInput(true);
    // slight delay so the panel renders before focusing
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const cancelTextInput = () => {
    setShowTextInput(false);
    setTextInput('');
    setMealError('');
  };

  const handlePhotoWater = async () => {
    setWaterError('');
    try {
      const raw = await capturePhoto();
      setAnalyzingWater(true);
      const apiImage = await resizeForApi(raw);
      const result = await analyzeWater(apiImage);
      const entry: WaterEntry = {
        id: uid(),
        timestamp: new Date().toISOString(),
        imageDataUrl: undefined,
        amount: result.amount,
        label: result.label,
      };
      addWater(entry);
      setShowQuickWater(false);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg !== 'No file selected') {
        console.error('Water analysis error:', msg);
        setWaterError(`Analysis failed: ${msg}`);
      }
    } finally {
      setAnalyzingWater(false);
    }
  };

  const handleQuickWater = (amount: number, label: string) => {
    const entry: WaterEntry = {
      id: uid(),
      timestamp: new Date().toISOString(),
      amount,
      label,
    };
    addWater(entry);
    setShowQuickWater(false);
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const busy = analyzingMeal || analyzingTextMeal;

  return (
    <div className="min-h-screen bg-orange-50 pb-24">
      {/* Header */}
      <div
        className="bg-gradient-to-br from-orange-500 to-orange-400 px-6 pb-8 text-white"
        style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))' }}
      >
        <p className="text-orange-100 text-sm font-medium mb-1">{today}</p>
        <h1 className="text-3xl font-bold mb-6">Nutrition</h1>
        <div className="space-y-4">
          <div className="bg-white/20 rounded-2xl p-4 space-y-3">
            <ProgressBar
              value={totalCalories}
              max={CALORIE_GOAL}
              color="bg-emerald-400"
              overColor="bg-red-400"
              label="Calories"
              unit="kcal"
              showOver
            />
            <ProgressBar
              value={totalWaterMl}
              max={WATER_GOAL_ML}
              color="bg-sky-300"
              label="Water"
              unit={`/ ${goalGlasses} glasses (${waterGlasses} so far)`}
            />
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Meals section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-stone-800">Today's Meals</h2>
            <span className="text-sm text-stone-500">{totalCalories.toLocaleString()} kcal</span>
          </div>

          {data.meals.length === 0 && !showTextInput && (
            <div className="bg-white rounded-3xl p-6 text-center text-stone-400 border border-stone-100">
              <UtensilsCrossed size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Log a meal by photo or description</p>
            </div>
          )}

          <div className="space-y-3">
            {data.meals.map(meal => (
              <div key={meal.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed size={20} className="text-orange-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm leading-tight">{meal.description}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{formatTime(meal.timestamp)}</p>
                    <p className="text-orange-500 font-bold text-sm mt-0.5">{meal.calories} kcal</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                      className="p-2 text-stone-400 hover:text-stone-600"
                    >
                      {expandedMeal === meal.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                      onClick={() => removeMeal(meal.id)}
                      className="p-2 text-stone-300 hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {expandedMeal === meal.id && meal.items.length > 0 && (
                  <div className="px-4 pb-3 border-t border-stone-50 pt-2 space-y-1">
                    {meal.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-stone-500">
                        <span>{item.name}</span>
                        <span className="font-medium">{item.calories} kcal</span>
                      </div>
                    ))}
                    {meal.notes && (
                      <p className="text-xs text-stone-400 italic mt-1">{meal.notes}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Inline text input panel */}
          {showTextInput && (
            <div className="mt-3 bg-white rounded-3xl p-4 shadow-sm border border-stone-100">
              <p className="text-sm font-semibold text-stone-700 mb-2">Describe your meal</p>
              <textarea
                ref={textareaRef}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddMealFromText();
                }}
                placeholder="e.g. 2 scrambled eggs, toast with butter, glass of OJ"
                rows={3}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddMealFromText}
                  disabled={!textInput.trim() || analyzingTextMeal}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl py-3 transition-colors disabled:opacity-60"
                >
                  {analyzingTextMeal
                    ? <><Loader2 size={16} className="animate-spin" /> Estimating…</>
                    : 'Estimate Calories'}
                </button>
                <button
                  onClick={cancelTextInput}
                  className="px-5 text-stone-400 font-medium text-sm rounded-2xl bg-stone-100 transition-colors hover:bg-stone-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mealError && <p className="text-sm text-red-500 mt-2 text-center">{mealError}</p>}

          {/* Action buttons — Photo + Type it in */}
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleAddMeal}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold rounded-2xl py-4 transition-colors disabled:opacity-60"
            >
              {analyzingMeal
                ? <><Loader2 size={18} className="animate-spin" /> Analyzing…</>
                : <><Camera size={18} /> Photo</>}
            </button>
            <button
              onClick={openTextInput}
              disabled={busy || showTextInput}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-600 font-semibold rounded-2xl py-4 transition-colors disabled:opacity-50"
            >
              <PencilLine size={18} /> Type it in
            </button>
          </div>
        </section>

        {/* Water section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-stone-800">Water</h2>
            <span className="text-sm text-stone-500">{waterGlasses} / {goalGlasses} glasses</span>
          </div>

          {data.waterEntries.length > 0 && (
            <div className="space-y-2 mb-3">
              {data.waterEntries.map(w => (
                <div key={w.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-stone-100">
                  {w.imageDataUrl ? (
                    <img src={w.imageDataUrl} alt={w.label} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                      <Droplets size={18} className="text-sky-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-700">{w.label}</p>
                    <p className="text-xs text-stone-400">{formatTime(w.timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sky-500 font-bold text-sm">{w.amount} ml</span>
                    <button onClick={() => removeWater(w.id)} className="p-1 text-stone-300 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {waterError && <p className="text-sm text-red-500 mb-2 text-center">{waterError}</p>}

          {/* Quick-add preset panel */}
          {showQuickWater && (
            <div className="bg-white rounded-3xl p-4 mb-3 shadow-sm border border-stone-100 space-y-2">
              <p className="text-sm font-semibold text-stone-600 mb-2">Quick add</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_WATER.map(({ label, amount }) => (
                  <button
                    key={label}
                    onClick={() => handleQuickWater(amount, label)}
                    className="bg-sky-50 text-sky-600 font-medium text-sm rounded-xl py-2.5 px-3 text-left hover:bg-sky-100 transition-colors"
                  >
                    {label}
                    <span className="block text-xs text-sky-400">{amount} ml</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowQuickWater(false)}
                className="w-full text-stone-400 text-sm py-1"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Action buttons — Photo + Quick Add */}
          <div className="flex gap-3">
            <button
              onClick={handlePhotoWater}
              disabled={analyzingWater}
              className="flex-1 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold rounded-2xl py-4 transition-colors disabled:opacity-60"
            >
              {analyzingWater
                ? <><Loader2 size={18} className="animate-spin" /> Analyzing…</>
                : <><Camera size={18} /> Photo</>}
            </button>
            <button
              onClick={() => setShowQuickWater(v => !v)}
              disabled={analyzingWater}
              className="flex-1 flex items-center justify-center gap-2 bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-600 font-semibold rounded-2xl py-4 transition-colors disabled:opacity-50"
            >
              <Plus size={18} /> Quick Add
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
