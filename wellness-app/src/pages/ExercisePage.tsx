import { useState } from 'react';
import { Scale, Flame, PersonStanding, Dumbbell, Check, X, Target } from 'lucide-react';
import { useDailyData, getAllDays, getTargetWeight, saveTargetWeight } from '../hooks/useDailyData';

type YesNo = boolean | null;

interface ActivityRowProps {
  icon: React.ReactNode;
  label: string;
  value: YesNo;
  onChange: (v: YesNo) => void;
}

function ActivityRow({ icon, label, value, onChange }: ActivityRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
          {icon}
        </div>
        <span className="font-medium text-stone-700">{label}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(value === true ? null : true)}
          className={`w-14 h-9 rounded-xl text-sm font-semibold transition-colors ${
            value === true
              ? 'bg-emerald-500 text-white'
              : 'bg-stone-100 text-stone-400'
          }`}
        >
          Yes
        </button>
        <button
          onClick={() => onChange(value === false ? null : false)}
          className={`w-14 h-9 rounded-xl text-sm font-semibold transition-colors ${
            value === false
              ? 'bg-red-400 text-white'
              : 'bg-stone-100 text-stone-400'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

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
  const [targetSaved, setTargetSaved] = useState(!!getTargetWeight());

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
      setTargetSaved(true);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const activityScore = [data.cardio, data.stretched, data.resistance].filter(v => v === true).length;
  const subtitle = activityScore === 0
    ? 'Log today\'s movement'
    : activityScore === 3
    ? 'Crushed it today! 🎉'
    : `${activityScore}/3 activities done`;

  return (
    <div className="min-h-screen bg-emerald-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-400 px-6 pt-14 pb-8 text-white" style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))' }}>
        <p className="text-emerald-100 text-sm font-medium mb-1">{today}</p>
        <h1 className="text-3xl font-bold">Move</h1>
        <p className="text-emerald-100 text-sm mt-1">{subtitle}</p>
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
        </section>

        {/* Target Weight */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-4">
            <Target size={20} className="text-emerald-500" />
            <h2 className="text-lg font-bold text-stone-800">Target Weight</h2>
          </div>

          {targetSaved && (
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-3xl font-bold text-emerald-600">{getTargetWeight()}</span>
              <span className="text-stone-400 font-medium">lbs goal</span>
            </div>
          )}

          <div className="flex gap-3">
            <input
              type="number"
              inputMode="decimal"
              value={targetInput}
              onChange={e => { setTargetInput(e.target.value); setTargetSaved(false); }}
              placeholder={targetSaved ? getTargetWeight()?.toString() : 'Set goal weight'}
              className="flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <span className="self-center text-stone-400 font-medium text-sm">lbs</span>
            <button
              onClick={handleSaveTarget}
              disabled={!targetInput || targetSaved}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl px-5 py-3 transition-colors disabled:opacity-40"
            >
              <Check size={18} />
            </button>
          </div>
          {data.weight && getTargetWeight() && (
            <p className="text-xs text-stone-400 mt-2">
              {data.weight > getTargetWeight()!
                ? `${Math.round(data.weight - getTargetWeight()!)} lbs to goal`
                : '🎯 At or below goal weight!'}
            </p>
          )}
        </section>

        {/* Activities */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
          <h2 className="text-lg font-bold text-stone-800 mb-2">Activity Check-in</h2>
          <p className="text-sm text-stone-400 mb-4">Did you do any of these today?</p>

          <ActivityRow
            icon={<Flame size={18} />}
            label="Intense Cardio"
            value={data.cardio}
            onChange={v => update({ cardio: v })}
          />
          <ActivityRow
            icon={<PersonStanding size={18} />}
            label="Stretching"
            value={data.stretched}
            onChange={v => update({ stretched: v })}
          />
          <ActivityRow
            icon={<Dumbbell size={18} />}
            label="Resistance Training"
            value={data.resistance}
            onChange={v => update({ resistance: v })}
          />
        </section>

        {/* Activity summary chips */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Cardio', value: data.cardio },
            { label: 'Stretch', value: data.stretched },
            { label: 'Resistance', value: data.resistance },
          ].map(({ label, value }) => (
            <div
              key={label}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                value === true
                  ? 'bg-emerald-100 text-emerald-700'
                  : value === false
                  ? 'bg-red-50 text-red-400'
                  : 'bg-stone-100 text-stone-400'
              }`}
            >
              {value === true ? <Check size={13} /> : value === false ? <X size={13} /> : null}
              {label}
            </div>
          ))}
        </div>

        {/* Weight history */}
        <WeightHistory />
      </div>
    </div>
  );
}
