import { useState, useRef } from 'react';
import {
  Scale, Check, X, Target, Pencil,
  Camera, Droplets, Plus, Trash2, ChevronDown, ChevronUp,
  Loader2, UtensilsCrossed, PencilLine,
} from 'lucide-react';
import { useDailyData, getAllDays, getTargetWeight, saveTargetWeight, getLast14DatesData } from '../hooks/useDailyData';
import { analyzeMeal, analyzeMealFromText, analyzeWater, capturePhoto, resizeForApi } from '../api/client';
import ProgressBar from '../components/ProgressBar';
import type { Meal, WaterEntry } from '../types';
import { CALORIE_GOAL, WATER_GOAL_ML, WATER_GLASS_ML } from '../types';

// ── Helpers ───────────────────────────────────────────────────────
const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const uid = () => Math.random().toString(36).slice(2);

const QUICK_WATER = [
  { label: 'Small glass', amount: 200 },
  { label: 'Glass',       amount: 250 },
  { label: 'Large glass', amount: 350 },
  { label: 'Bottle (500ml)', amount: 500 },
  { label: 'Bottle (1L)', amount: 1000 },
];

const APP_START = '2026-05-23';
const ML_TO_OZ  = 1 / 29.5735;

function getWeightHistory(): { labels: string[]; data: (number | null)[] } {
  const storedDates = Object.keys(localStorage)
    .filter(k => k.startsWith('wellspace_') && !k.includes('target'))
    .map(k => k.replace('wellspace_', ''))
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  const startStr = storedDates.length > 0 && storedDates[0] < APP_START
    ? storedDates[0] : APP_START;

  const start = new Date(startStr + 'T00:00:00');
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const labels: string[] = [];
  const data: (number | null)[] = [];
  const cur = new Date(start);
  while (cur <= todayDate) {
    const key = cur.toISOString().split('T')[0];
    labels.push(`${cur.getMonth() + 1}/${cur.getDate()}`);
    try {
      const raw = localStorage.getItem(`wellspace_${key}`);
      const day = raw ? JSON.parse(raw) : null;
      data.push(day?.weight ?? null);
    } catch { data.push(null); }
    cur.setDate(cur.getDate() + 1);
  }
  return { labels, data };
}

function makeLabels14(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
}
const LABELS14 = makeLabels14();

// ── SVG chart geometry ─────────────────────────────────────────────
const W = 320, H = 100;
const PL = 36, PR = 8, PT = 8, PB = 20;
const PLOT_W = W - PL - PR;
const PLOT_H = H - PT - PB;
const N = 14;
const X_STEP = 3;
const barX = (i: number) => PL + (i + 0.5) * (PLOT_W / N);
const BAR_W = (PLOT_W / N) * 0.62;

function EmptyState() {
  return (
    <div className="h-24 flex items-center justify-center text-stone-300 text-sm">
      No data yet — start logging!
    </div>
  );
}

function LineChart({
  data,
  color,
  goalLine,
  yUnit = '',
  labels: labelsOverride,
}: {
  data: (number | null)[];
  color: string;
  goalLine?: number | null;
  yUnit?: string;
  labels?: string[];
}) {
  const n = data.length || 1;
  const chartLabels = labelsOverride ?? LABELS14.slice(0, n);
  const xStep = Math.max(1, Math.ceil(n / 5));
  const pxFn = (i: number) => PL + (n > 1 ? (i / (n - 1)) * PLOT_W : PLOT_W / 2);

  const valid = data.filter((v): v is number => v !== null);
  if (valid.length === 0) return <EmptyState />;

  const allVals = goalLine != null ? [...valid, goalLine] : valid;
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const pad = (rawMax - rawMin) * 0.18 || rawMax * 0.1 || 5;
  const lo = rawMin - pad;
  const hi = rawMax + pad;
  const range = hi - lo || 1;
  const py = (v: number) => PT + (1 - (v - lo) / range) * PLOT_H;

  let solidD = '', gapD = '';
  let gapped = true;
  let lastKnown: { i: number; v: number } | null = null;

  data.forEach((v, i) => {
    if (v === null) { gapped = true; return; }
    if (gapped && lastKnown !== null) {
      gapD += `M ${pxFn(lastKnown.i).toFixed(1)} ${py(lastKnown.v).toFixed(1)} `
            + `L ${pxFn(i).toFixed(1)} ${py(v).toFixed(1)} `;
    }
    solidD += gapped
      ? `M ${pxFn(i).toFixed(1)} ${py(v).toFixed(1)} `
      : `L ${pxFn(i).toFixed(1)} ${py(v).toFixed(1)} `;
    gapped = false;
    lastKnown = { i, v };
  });

  const yMid = (rawMin + rawMax) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      {[rawMax, yMid, rawMin].map((v, i) => (
        <line key={i} x1={PL} y1={py(v)} x2={W - PR} y2={py(v)} stroke="#f1f5f9" strokeWidth="0.8" />
      ))}
      {([rawMax, yMid, rawMin] as number[]).map((v, i) => (
        <text key={i} x={PL - 3} y={py(v) + 3} textAnchor="end" fontSize="7" fill="#cbd5e1">
          {Number.isInteger(v) ? v : v.toFixed(1)}{yUnit}
        </text>
      ))}
      {goalLine != null && (
        <>
          <line x1={PL} y1={py(goalLine)} x2={W - PR} y2={py(goalLine)}
            stroke="#10b981" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.85" />
          <text x={W - PR - 2} y={py(goalLine) - 3} textAnchor="end" fontSize="7" fill="#10b981" fontWeight="600">
            Goal
          </text>
        </>
      )}
      {gapD && (
        <path d={gapD} fill="none" stroke="#cbd5e1" strokeWidth="1.5"
          strokeDasharray="3 4" strokeLinecap="round" />
      )}
      <path d={solidD} fill="none" stroke={color} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => v !== null && (
        <circle key={i} cx={pxFn(i)} cy={py(v)} r="3"
          fill="white" stroke={color} strokeWidth="2" />
      ))}
      {chartLabels.map((l, i) => (i % xStep === 0 || i === n - 1) && (
        <text key={i} x={pxFn(i)} y={H - 3} textAnchor="middle" fontSize="7" fill="#cbd5e1">
          {l}
        </text>
      ))}
    </svg>
  );
}

function BarChart({ data, color }: { data: (number | null)[]; color: string }) {
  const valid = data.filter((v): v is number => v !== null && v > 0);
  if (valid.length === 0) return <EmptyState />;

  const maxV = Math.max(...valid) * 1.12;
  const py = (v: number) => PT + (1 - v / maxV) * PLOT_H;
  const bh = (v: number) => (v / maxV) * PLOT_H;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      {[maxV * 0.9, maxV * 0.45].map((v, i) => (
        <text key={i} x={PL - 3} y={py(v) + 3} textAnchor="end" fontSize="7" fill="#cbd5e1">
          {Math.round(v)}
        </text>
      ))}
      <text x={PL - 3} y={PT + PLOT_H + 3} textAnchor="end" fontSize="7" fill="#cbd5e1">0</text>
      {data.map((v, i) => (v != null && v > 0) && (
        <rect key={i}
          x={barX(i) - BAR_W / 2} y={PT + PLOT_H - bh(v)}
          width={BAR_W} height={bh(v)}
          rx="3" fill={color} opacity="0.85" />
      ))}
      {LABELS14.map((l, i) => (i % X_STEP === 0 || i === N - 1) && (
        <text key={i} x={barX(i)} y={H - 3} textAnchor="middle" fontSize="7" fill="#cbd5e1">
          {l}
        </text>
      ))}
    </svg>
  );
}

function avg(arr: (number | null)[]): number | null {
  const valid = arr.filter((v): v is number => v !== null);
  return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
}

// ── Countdown ─────────────────────────────────────────────────────
const GOAL_DATE = new Date('2027-02-04T00:00:00');
function daysUntilGoal(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((GOAL_DATE.getTime() - now.getTime()) / 86_400_000));
}

// ── Main Page ─────────────────────────────────────────────────────
export default function TodayPage() {
  const { data, update, addMeal, removeMeal, addWater, removeWater } = useDailyData();

  // Weight state
  const [weightInput, setWeightInput]   = useState(data.weight?.toString() ?? '');
  const [weightSaved, setWeightSaved]   = useState(!!data.weight);
  const [targetInput, setTargetInput]   = useState(getTargetWeight()?.toString() ?? '');
  const [editingTarget, setEditingTarget] = useState(false);

  // Meal state
  const [analyzingMeal, setAnalyzingMeal]         = useState(false);
  const [analyzingTextMeal, setAnalyzingTextMeal] = useState(false);
  const [analyzingWater, setAnalyzingWater]       = useState(false);
  const [expandedMeal, setExpandedMeal]           = useState<string | null>(null);
  const [mealError, setMealError]                 = useState('');
  const [waterError, setWaterError]               = useState('');
  const [showQuickWater, setShowQuickWater]       = useState(false);
  const [showTextInput, setShowTextInput]         = useState(false);
  const [textInput, setTextInput]                 = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Computed
  const totalCalories = data.meals.reduce((s, m) => s + m.calories, 0);
  const totalWaterMl  = data.waterEntries.reduce((s, w) => s + w.amount, 0);
  const waterGlasses  = Math.round((totalWaterMl / WATER_GLASS_ML) * 10) / 10;
  const goalGlasses   = WATER_GOAL_ML / WATER_GLASS_ML;
  const target        = getTargetWeight();
  const daysLeft      = daysUntilGoal();
  const busy          = analyzingMeal || analyzingTextMeal;

  const last14 = getLast14DatesData();
  const calorieData = last14.map(d => {
    if (!d) return null;
    const t = d.meals.reduce((s, m) => s + m.calories, 0);
    return t > 0 ? t : null;
  });
  const avgCals = avg(calorieData);
  const weightHistory = getWeightHistory();

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // ── Handlers ──────────────────────────────────────────────────
  const handleSaveWeight = () => {
    const w = parseFloat(weightInput);
    if (!isNaN(w) && w > 0) { update({ weight: w }); setWeightSaved(true); }
  };

  const handleSaveTarget = () => {
    const w = parseFloat(targetInput);
    if (!isNaN(w) && w > 0) { saveTargetWeight(w); setEditingTarget(false); }
  };

  const handleAddMeal = async () => {
    setMealError(''); setShowTextInput(false);
    try {
      const raw = await capturePhoto();
      setAnalyzingMeal(true);
      const apiImage = await resizeForApi(raw);
      const result = await analyzeMeal(apiImage);
      addMeal({
        id: uid(), timestamp: new Date().toISOString(), imageDataUrl: '',
        description: result.description, calories: result.calories,
        items: result.items ?? [], notes: result.notes ?? '',
      } as Meal);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg !== 'No file selected') setMealError(`Analysis failed: ${msg}`);
    } finally { setAnalyzingMeal(false); }
  };

  const handleAddMealFromText = async () => {
    const desc = textInput.trim();
    if (!desc) return;
    setMealError('');
    try {
      setAnalyzingTextMeal(true);
      const result = await analyzeMealFromText(desc);
      addMeal({
        id: uid(), timestamp: new Date().toISOString(), imageDataUrl: '',
        description: result.description, calories: result.calories,
        items: result.items ?? [], notes: result.notes ?? '',
      } as Meal);
      setShowTextInput(false);
      setTextInput('');
    } catch (err) {
      const msg = (err as Error).message;
      setMealError(`Analysis failed: ${msg}`);
    } finally { setAnalyzingTextMeal(false); }
  };

  const openTextInput = () => {
    setMealError(''); setShowTextInput(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handlePhotoWater = async () => {
    setWaterError('');
    try {
      const raw = await capturePhoto();
      setAnalyzingWater(true);
      const apiImage = await resizeForApi(raw);
      const result = await analyzeWater(apiImage);
      addWater({
        id: uid(), timestamp: new Date().toISOString(),
        imageDataUrl: undefined, amount: result.amount, label: result.label,
      } as WaterEntry);
      setShowQuickWater(false);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg !== 'No file selected') setWaterError(`Analysis failed: ${msg}`);
    } finally { setAnalyzingWater(false); }
  };

  const handleQuickWater = (amount: number, label: string) => {
    addWater({ id: uid(), timestamp: new Date().toISOString(), amount, label } as WaterEntry);
    setShowQuickWater(false);
  };

  return (
    <div className="min-h-screen bg-orange-50 pb-10">

      {/* ── Header ───────────────────────────────────────────── */}
      <div
        className="bg-gradient-to-br from-orange-500 to-orange-400 px-6 pb-6 text-white"
        style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))' }}
      >
        <p className="text-orange-100 text-sm font-medium mb-2">{todayStr}</p>

        {/* Countdown */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-5xl font-black tracking-tight">{daysLeft}</span>
          <div>
            <p className="text-white font-bold text-base leading-tight">days</p>
            <p className="text-orange-200 text-xs">until Feb 4, 2027</p>
          </div>
        </div>

        {/* Target weight */}
        <div className="mb-4">
          {editingTarget ? (
            <div className="flex items-center gap-2">
              <input
                type="number" inputMode="decimal"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveTarget()}
                placeholder="Goal weight"
                autoFocus
                className="bg-white/20 text-white placeholder-orange-200 rounded-xl px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              <span className="text-orange-200 text-sm">lbs</span>
              <button onClick={handleSaveTarget}
                className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors">
                Save
              </button>
              <button
                onClick={() => { setTargetInput(target?.toString() ?? ''); setEditingTarget(false); }}
                className="text-orange-200 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingTarget(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 transition-colors">
              <Target size={14} className="text-orange-200" />
              <span className="text-white/80 text-sm font-medium">
                {target ? `Goal: ${target} lbs` : 'Set goal weight'}
              </span>
              <Pencil size={13} className="text-orange-300" />
            </button>
          )}
        </div>

        {/* Progress bars */}
        <div className="bg-white/20 rounded-2xl p-4 space-y-3">
          <ProgressBar
            value={totalCalories} max={CALORIE_GOAL}
            color="bg-emerald-400" overColor="bg-red-400"
            label="Calories" unit="kcal" showOver
          />
          <ProgressBar
            value={totalWaterMl} max={WATER_GOAL_ML}
            color="bg-sky-300" label="Water"
            unit={`/ ${goalGlasses} glasses (${waterGlasses} so far)`}
          />
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* ── Daily Weight ─────────────────────────────────────── */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-4">
            <Scale size={20} className="text-emerald-500" />
            <h2 className="text-lg font-bold text-stone-800">Today's Weight</h2>
          </div>

          {weightSaved && (
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-4xl font-bold text-stone-800">{data.weight}</span>
              <span className="text-stone-400 font-medium">lbs</span>
            </div>
          )}

          <div className="flex gap-3">
            <input
              type="number" inputMode="decimal"
              value={weightInput}
              onChange={e => { setWeightInput(e.target.value); setWeightSaved(false); }}
              placeholder={weightSaved ? data.weight?.toString() : 'Enter weight'}
              className="flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <span className="self-center text-stone-400 font-medium text-sm">lbs</span>
            <button
              onClick={handleSaveWeight}
              disabled={!weightInput || weightSaved}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl px-5 py-3 transition-colors disabled:opacity-40"
            >
              <Check size={18} />
            </button>
          </div>

          {data.weight && target && (
            <p className="text-xs text-stone-400 mt-2">
              {data.weight > target
                ? `${Math.round(data.weight - target)} lbs to goal`
                : '🎯 At or below goal weight!'}
            </p>
          )}
        </section>

        {/* ── Meals ────────────────────────────────────────────── */}
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
                    <button onClick={() => removeMeal(meal.id)} className="p-2 text-stone-300 hover:text-red-400">
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
                    {meal.notes && <p className="text-xs text-stone-400 italic mt-1">{meal.notes}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {showTextInput && (
            <div className="mt-3 bg-white rounded-3xl p-4 shadow-sm border border-stone-100">
              <p className="text-sm font-semibold text-stone-700 mb-2">Describe your meal</p>
              <textarea
                ref={textareaRef}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddMealFromText(); }}
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
                  onClick={() => { setShowTextInput(false); setTextInput(''); setMealError(''); }}
                  className="px-5 text-stone-400 font-medium text-sm rounded-2xl bg-stone-100 transition-colors hover:bg-stone-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mealError && <p className="text-sm text-red-500 mt-2 text-center">{mealError}</p>}

          <div className="flex gap-3 mt-3">
            <button
              onClick={handleAddMeal} disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold rounded-2xl py-4 transition-colors disabled:opacity-60"
            >
              {analyzingMeal
                ? <><Loader2 size={18} className="animate-spin" /> Analyzing…</>
                : <><Camera size={18} /> Photo</>}
            </button>
            <button
              onClick={openTextInput} disabled={busy || showTextInput}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-600 font-semibold rounded-2xl py-4 transition-colors disabled:opacity-50"
            >
              <PencilLine size={18} /> Type it in
            </button>
          </div>
        </section>

        {/* ── Water ────────────────────────────────────────────── */}
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

          {showQuickWater && (
            <div className="bg-white rounded-3xl p-4 mb-3 shadow-sm border border-stone-100 space-y-2">
              <p className="text-sm font-semibold text-stone-600 mb-2">Quick add</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_WATER.map(({ label, amount }) => (
                  <button key={label} onClick={() => handleQuickWater(amount, label)}
                    className="bg-sky-50 text-sky-600 font-medium text-sm rounded-xl py-2.5 px-3 text-left hover:bg-sky-100 transition-colors">
                    {label}
                    <span className="block text-xs text-sky-400">{amount} ml</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowQuickWater(false)} className="w-full text-stone-400 text-sm py-1">
                Cancel
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handlePhotoWater} disabled={analyzingWater}
              className="flex-1 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold rounded-2xl py-4 transition-colors disabled:opacity-60"
            >
              {analyzingWater
                ? <><Loader2 size={18} className="animate-spin" /> Analyzing…</>
                : <><Camera size={18} /> Photo</>}
            </button>
            <button
              onClick={() => setShowQuickWater(v => !v)} disabled={analyzingWater}
              className="flex-1 flex items-center justify-center gap-2 bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-600 font-semibold rounded-2xl py-4 transition-colors disabled:opacity-50"
            >
              <Plus size={18} /> Quick Add
            </button>
          </div>
        </section>

        {/* ── Weight Trend ─────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
          <h3 className="font-bold text-stone-800 text-base mb-1">Weight Trend</h3>
          <p className="text-xs text-stone-400 mb-3">
            {(() => {
              const validWeights = weightHistory.data.filter((v): v is number => v !== null);
              const latest = validWeights.at(-1) ?? null;
              if (!latest) return 'No weight logged yet';
              if (target) {
                return latest > target
                  ? `${latest} lbs → ${Math.round(latest - target)} lbs to goal (${target} lbs)`
                  : `${latest} lbs — 🎯 Goal reached! (${target} lbs)`;
              }
              return `${latest} lbs`;
            })()}
          </p>
          <LineChart
            data={weightHistory.data}
            labels={weightHistory.labels}
            color="#10b981"
            goalLine={target}
            yUnit=" lbs"
          />
        </div>

        {/* ── Calorie Trend ─────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
          <h3 className="font-bold text-stone-800 text-base mb-1">Calories per Day</h3>
          <p className="text-xs text-stone-400 mb-3">
            {avgCals ? `14-day avg: ${avgCals.toLocaleString()} kcal` : 'No meals logged yet'}
          </p>
          <BarChart data={calorieData} color="#FF6D2A" />
        </div>

      </div>
    </div>
  );
}
