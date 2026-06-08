import { useState } from 'react';
import { Scale, Check, X, Target, Pencil } from 'lucide-react';
import { useDailyData, getAllDays, getTargetWeight, saveTargetWeight } from '../hooks/useDailyData';

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
}

function WeightHistory() {
  const days = getAllDays()
    .filter(d => d.weight != null)
    .slice(0, 7)
    .reverse();

  if (days.length < 2) return null;

  const weights = days.map(d => d.weight as number);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
      <h3 className="font-bold text-stone-800 mb-4">Weight Trend</h3>
      <div className="flex items-end gap-2 h-20">
        {days.map((d, i) => {
          const h = 20 + ((d.weight! - min) / range) * 48;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-stone-400 font-medium">{d.weight}</span>
              <div
                className="w-full rounded-t-lg bg-emerald-400 transition-all"
                style={{ height: `${h}px` }}
              />
              <span className="text-[9px] text-stone-400">{formatShortDate(d.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ExercisePage() {
  const { data, update } = useDailyData();
  const [weightInput, setWeightInput] = useState(data.weight?.toString() ?? '');
  const [weightSaved, setWeightSaved] = useState(!!data.weight);
  const [targetInput, setTargetInput] = useState(getTargetWeight()?.toString() ?? '');
  const [editingTarget, setEditingTarget] = useState(false);

  const handleSaveWeight = () => {
    const w = parseFloat(weightInput);
    if (!isNaN(w) && w > 0) {
      update({ weight: w });
      setWeightSaved(true);
    }
  };

  const handleSaveTarget = () => {
    const w = parseFloat(targetInput);
    if (!isNaN(w) && w > 0) {
      saveTargetWeight(w);
      setEditingTarget(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const target = getTargetWeight();

  return (
    <div className="min-h-screen bg-emerald-50 pb-24">
      {/* Header */}
      <div
        className="bg-gradient-to-br from-emerald-500 to-emerald-400 px-6 pb-8 text-white"
        style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))' }}
      >
        <p className="text-emerald-100 text-sm font-medium mb-1">{today}</p>
        <h1 className="text-3xl font-bold">Body</h1>
        <p className="text-emerald-100 text-sm mt-1">Track your weight and progress</p>

        {/* Target weight — inline edit */}
        <div className="mt-3">
          {editingTarget ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveTarget()}
                placeholder="Goal weight"
                autoFocus
                className="bg-white/20 text-white placeholder-emerald-200 rounded-xl px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              <span className="text-emerald-200 text-sm">lbs</span>
              <button
                onClick={handleSaveTarget}
                className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setTargetInput(target?.toString() ?? ''); setEditingTarget(false); }}
                className="text-emerald-200 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTarget(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 transition-colors"
            >
              <Target size={14} className="text-emerald-200" />
              <span className="text-white/80 text-sm font-medium">
                {target ? `Goal: ${target} lbs` : 'Set goal weight'}
              </span>
              <Pencil size={13} className="text-emerald-300" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Weight */}
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
              type="number"
              inputMode="decimal"
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

        {/* Weight history */}
        <WeightHistory />
      </div>
    </div>
  );
}
