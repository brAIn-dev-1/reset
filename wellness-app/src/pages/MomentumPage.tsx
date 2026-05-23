import { TrendingUp } from 'lucide-react';
import { getLast14DatesData, getAllDays, getTargetWeight, calcStreak } from '../hooks/useDailyData';
import type { DayData } from '../types';

// ── Constants ────────────────────────────────────────────────────
const ML_TO_OZ = 1 / 29.5735;

// ── Chart labels (14 days, oldest first) ─────────────────────────
function makeLabels(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
}
const LABELS = makeLabels();

// ── SVG geometry ─────────────────────────────────────────────────
const W = 320, H = 100;
const PL = 36, PR = 8, PT = 8, PB = 20;
const PLOT_W = W - PL - PR;
const PLOT_H = H - PT - PB;
const N = 14;
const X_STEP = 3; // show a label every 3 slots

const px = (i: number) => PL + (N > 1 ? (i / (N - 1)) * PLOT_W : PLOT_W / 2);
const barX = (i: number) => PL + (i + 0.5) * (PLOT_W / N);
const BAR_W = (PLOT_W / N) * 0.62;

// ── Empty state ───────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="h-24 flex items-center justify-center text-stone-300 text-sm">
      No data yet — start logging!
    </div>
  );
}

// ── Line Chart ────────────────────────────────────────────────────
function LineChart({
  data,
  color,
  goalLine,
  yUnit = '',
}: {
  data: (number | null)[];
  color: string;
  goalLine?: number | null;
  yUnit?: string;
}) {
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

  // Build SVG path (handles gaps for null values)
  let pathD = '';
  let gapped = true;
  data.forEach((v, i) => {
    if (v === null) { gapped = true; return; }
    pathD += gapped ? `M ${px(i).toFixed(1)} ${py(v).toFixed(1)} ` : `L ${px(i).toFixed(1)} ${py(v).toFixed(1)} `;
    gapped = false;
  });

  const yMid = (rawMin + rawMax) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      {/* Subtle grid */}
      {[rawMax, yMid, rawMin].map((v, i) => (
        <line key={i} x1={PL} y1={py(v)} x2={W - PR} y2={py(v)}
          stroke="#f1f5f9" strokeWidth="0.8" />
      ))}

      {/* Y labels */}
      {([rawMax, yMid, rawMin] as number[]).map((v, i) => (
        <text key={i} x={PL - 3} y={py(v) + 3} textAnchor="end" fontSize="7" fill="#cbd5e1">
          {Number.isInteger(v) ? v : v.toFixed(1)}{yUnit}
        </text>
      ))}

      {/* Goal dashed line */}
      {goalLine != null && (
        <>
          <line x1={PL} y1={py(goalLine)} x2={W - PR} y2={py(goalLine)}
            stroke="#10b981" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.85" />
          <text x={W - PR - 2} y={py(goalLine) - 3} textAnchor="end" fontSize="7" fill="#10b981" fontWeight="600">
            Goal
          </text>
        </>
      )}

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {data.map((v, i) => v !== null && (
        <circle key={i} cx={px(i)} cy={py(v)} r="3"
          fill="white" stroke={color} strokeWidth="2" />
      ))}

      {/* X labels */}
      {LABELS.map((l, i) => (i % X_STEP === 0 || i === N - 1) && (
        <text key={i} x={px(i)} y={H - 3} textAnchor="middle" fontSize="7" fill="#cbd5e1">
          {l}
        </text>
      ))}
    </svg>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────
function BarChart({ data, color }: { data: (number | null)[]; color: string }) {
  const valid = data.filter((v): v is number => v !== null && v > 0);
  if (valid.length === 0) return <EmptyState />;

  const maxV = Math.max(...valid) * 1.12;
  const py = (v: number) => PT + (1 - v / maxV) * PLOT_H;
  const bh = (v: number) => (v / maxV) * PLOT_H;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      {/* Y labels */}
      {[maxV * 0.9, maxV * 0.45].map((v, i) => (
        <text key={i} x={PL - 3} y={py(v) + 3} textAnchor="end" fontSize="7" fill="#cbd5e1">
          {Math.round(v)}
        </text>
      ))}
      <text x={PL - 3} y={PT + PLOT_H + 3} textAnchor="end" fontSize="7" fill="#cbd5e1">0</text>

      {/* Bars */}
      {data.map((v, i) => (v != null && v > 0) && (
        <rect key={i}
          x={barX(i) - BAR_W / 2} y={PT + PLOT_H - bh(v)}
          width={BAR_W} height={bh(v)}
          rx="3" fill={color} opacity="0.85" />
      ))}

      {/* X labels */}
      {LABELS.map((l, i) => (i % X_STEP === 0 || i === N - 1) && (
        <text key={i} x={barX(i)} y={H - 3} textAnchor="middle" fontSize="7" fill="#cbd5e1">
          {l}
        </text>
      ))}
    </svg>
  );
}

// ── Streak Dot Row ────────────────────────────────────────────────
function StreakDots({
  data,
  field,
}: {
  data: (DayData | null)[];
  field: 'cardio' | 'stretched' | 'resistance';
}) {
  return (
    <div className="flex gap-1 mt-3">
      {data.map((d, i) => {
        const val = d?.[field] ?? null;
        return (
          <div key={i} title={d?.date ?? ''}
            className={`flex-1 h-5 rounded-md transition-colors ${
              val === true  ? 'bg-emerald-400' :
              val === false ? 'bg-red-300' :
              'bg-stone-100'
            }`}
          />
        );
      })}
    </div>
  );
}

// ── Chart card wrapper ────────────────────────────────────────────
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
      <h3 className="font-bold text-stone-800 text-base leading-tight">{title}</h3>
      {subtitle && <p className="text-xs text-stone-400 mt-0.5 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

// ── Streak card ───────────────────────────────────────────────────
function StreakCard({
  title,
  streak,
  data,
  field,
}: {
  title: string;
  streak: number;
  data: (DayData | null)[];
  field: 'cardio' | 'stretched' | 'resistance';
}) {
  return (
    <ChartCard title={title}>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-stone-800 tabular-nums">{streak}</span>
        <span className="text-stone-500 font-medium">
          day{streak !== 1 ? 's' : ''} in a row{streak >= 3 ? ' 🔥' : ''}
        </span>
      </div>
      <StreakDots data={data} field={field} />
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-stone-300">14 days ago</span>
        <span className="text-[10px] text-stone-300">Today</span>
      </div>
    </ChartCard>
  );
}

// ── Average helper ────────────────────────────────────────────────
function avg(arr: (number | null)[]): number | null {
  const valid = arr.filter((v): v is number => v !== null);
  return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
}

// ── Daily rotating message ────────────────────────────────────────
const DAILY_MESSAGES = [
  "Welcome back. Keep going.",
  "Every rep counts. Every bite matters.",
  "Progress is built one day at a time.",
  "You showed up. That's what counts.",
  "Small steps, big momentum.",
  "Consistency is the real superpower.",
  "Today is another chance to feel great.",
  "Your future self is cheering you on.",
  "Build the habit. Trust the process.",
  "Strength grows from showing up.",
  "Every healthy choice adds up.",
  "You're closer than you think.",
  "Movement, nourishment, mindfulness — you've got this.",
  "One day at a time. One choice at a time.",
  "Progress, not perfection.",
  "Take care of your body — it's the only place you live.",
  "Good habits are worth more than motivation.",
  "Rest when you need to. Push when you can.",
  "Every step forward counts.",
  "Health is wealth. Keep investing.",
  "Today's effort is tomorrow's result.",
  "Be the person your future self will thank.",
  "Momentum is built, not found.",
  "Fuel well. Move often. Rest deeply.",
  "Celebrate the small wins.",
  "Discipline is remembering what you want.",
  "Keep going. You're doing better than you think.",
  "The best investment you can make is in yourself.",
  "Show up for yourself today.",
  "Greatness is just consistency over time.",
];

function getDailyMessage(): string {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - start) / 86_400_000);
  return DAILY_MESSAGES[dayOfYear % DAILY_MESSAGES.length];
}

// ── Yesterday summary ─────────────────────────────────────────────
function generateYesterdaySummary(yesterday: DayData | null): string {
  if (!yesterday) return "No data from yesterday — today's a fresh start!";

  const cals    = yesterday.meals.reduce((s, m) => s + m.calories, 0);
  const waterMl = yesterday.waterEntries.reduce((s, w) => s + w.amount, 0);
  const medMins = yesterday.meditationMinutes;
  const exerciseDone = [yesterday.cardio, yesterday.stretched, yesterday.resistance]
    .filter(v => v === true).length;
  const exerciseLogged = [yesterday.cardio, yesterday.stretched, yesterday.resistance]
    .filter(v => v !== null).length;

  const hasAnyData = cals > 0 || waterMl > 0 || medMins > 0 || exerciseLogged > 0 || yesterday.weight != null;
  if (!hasAnyData) return "Nothing logged yesterday — keep building the habit!";

  const wins: string[] = [];
  const focus: string[] = [];

  if (cals > 0 && cals <= 2000)  wins.push('diet');
  else if (cals > 2000)           focus.push('calories');

  if (waterMl >= 2000)            wins.push('hydration');
  else if (waterMl > 0)           focus.push('water');
  else if (waterMl === 0)         focus.push('water');

  if (medMins >= 10)              wins.push('meditation');
  else                            focus.push('meditation');

  if (exerciseDone >= 2)          wins.push('exercise');
  else if (exerciseLogged > 0 && exerciseDone < 2) focus.push('movement');

  let msg: string;
  if (wins.length > 0 && focus.length > 0) {
    msg = `${wins.slice(0, 2).join(' & ')} on track — focus on ${focus[0]} today`;
  } else if (wins.length > 0) {
    msg = `Strong day — ${wins.join(', ')} all solid. Keep it up!`;
  } else {
    msg = `Work on ${focus.slice(0, 2).join(' and ')} today`;
  }

  msg = msg.charAt(0).toUpperCase() + msg.slice(1);
  return msg.length > 100 ? msg.slice(0, 97) + '…' : msg;
}

// ── Main Page ─────────────────────────────────────────────────────
export default function MomentumPage() {
  const last14 = getLast14DatesData();       // null | DayData[], index 0 = oldest
  const allDays = getAllDays();               // newest first, for streaks
  const targetWeight = getTargetWeight();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // ── Data series ────────────────────────────────────────────────
  const weightData = last14.map(d => d?.weight ?? null);

  const calorieData = last14.map(d => {
    if (!d) return null;
    const t = d.meals.reduce((s, m) => s + m.calories, 0);
    return t > 0 ? t : null;
  });

  const waterOzData = last14.map(d => {
    if (!d) return null;
    const t = d.waterEntries.reduce((s, w) => s + w.amount, 0);
    return t > 0 ? Math.round(t * ML_TO_OZ) : null;
  });

  const meditationData = last14.map(d => {
    if (!d) return null;
    return d.meditationMinutes > 0 ? d.meditationMinutes : null;
  });

  // ── Summaries ──────────────────────────────────────────────────
  const validWeights = weightData.filter((v): v is number => v !== null);
  const latestWeight = validWeights.at(-1) ?? null;

  const avgCals  = avg(calorieData);
  const avgWater = avg(waterOzData);
  const totalMed = meditationData
    .filter((v): v is number => v !== null)
    .reduce((a, b) => a + b, 0) || null;

  // ── Streaks ────────────────────────────────────────────────────
  const stretchStreak    = calcStreak(allDays, 'stretched');
  const cardioStreak     = calcStreak(allDays, 'cardio');
  const resistanceStreak = calcStreak(allDays, 'resistance');

  // ── Daily insight ──────────────────────────────────────────────
  const dailyMessage     = getDailyMessage();
  const yesterday        = last14[12] ?? null; // index 12 = yesterday
  const yesterdaySummary = generateYesterdaySummary(yesterday);

  // ── Weight subtitle ────────────────────────────────────────────
  const weightSubtitle = latestWeight
    ? targetWeight
      ? latestWeight > targetWeight
        ? `${latestWeight} lbs → ${Math.round(latestWeight - targetWeight)} lbs to goal (${targetWeight} lbs)`
        : `${latestWeight} lbs — 🎯 Goal reached! (${targetWeight} lbs)`
      : `Latest: ${latestWeight} lbs · Set a goal on the Move tab`
    : 'No weight logged yet';

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* ── Header ── */}
      <div
        className="bg-gradient-to-br from-slate-800 to-slate-700 px-6 pb-8 text-white"
        style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))' }}
      >
        <p className="text-slate-400 text-sm font-medium mb-1">{today}</p>
        <div className="flex items-center gap-2.5 mb-5">
          <TrendingUp size={26} className="text-orange-400" />
          <h1 className="text-3xl font-bold">Momentum</h1>
        </div>

        {/* Daily insight card */}
        <div className="bg-white/10 rounded-2xl p-4 space-y-3">
          <p className="text-white font-semibold text-base leading-snug">
            {dailyMessage}
          </p>
          <div className="h-px bg-white/15" />
          <p className="text-slate-300 text-sm leading-relaxed">
            {yesterdaySummary}
          </p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* 1. Weight */}
        <ChartCard title="Weight" subtitle={weightSubtitle}>
          <LineChart data={weightData} color="#10b981" goalLine={targetWeight} yUnit=" lbs" />
        </ChartCard>

        {/* 2. Calories */}
        <ChartCard
          title="Calories per Day"
          subtitle={avgCals ? `14-day avg: ${avgCals.toLocaleString()} kcal` : 'No meals logged yet'}
        >
          <BarChart data={calorieData} color="#FF6D2A" />
        </ChartCard>

        {/* 3. Water */}
        <ChartCard
          title="Water per Day"
          subtitle={avgWater ? `14-day avg: ${avgWater} oz/day` : 'No water logged yet'}
        >
          <BarChart data={waterOzData} color="#0EA5E9" />
        </ChartCard>

        {/* 4. Meditation */}
        <ChartCard
          title="Meditation per Day"
          subtitle={totalMed ? `Last 14 days: ${totalMed} min total` : 'No sessions logged yet'}
        >
          <BarChart data={meditationData} color="#A855F7" />
        </ChartCard>

        {/* 5. Stretching streak */}
        <StreakCard
          title="Stretching Streak"
          streak={stretchStreak}
          data={last14}
          field="stretched"
        />

        {/* 6. Cardio streak */}
        <StreakCard
          title="Cardio Streak"
          streak={cardioStreak}
          data={last14}
          field="cardio"
        />

        {/* 7. Resistance streak */}
        <StreakCard
          title="Resistance Training Streak"
          streak={resistanceStreak}
          data={last14}
          field="resistance"
        />
      </div>
    </div>
  );
}
