import { useState, useEffect, useRef } from 'react';
import { Heart, Play, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { useDailyData, getAllDays } from '../hooks/useDailyData';

const PRESETS = [5, 10, 15, 20];

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function MentalPage() {
  const { data, update, addMeditationMinutes } = useDailyData();
  const [draft, setDraft] = useState(data.gratitude);
  const [saved, setSaved] = useState(!!data.gratitude);
  const [editing, setEditing] = useState(!data.gratitude);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDays, setHistoryDays] = useState<{ date: string; gratitude: string }[]>([]);

  // Meditation timer
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [targetMinutes, setTargetMinutes] = useState(10);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      startRef.current = Date.now() - elapsed;
      const tick = () => {
        setElapsed(Date.now() - (startRef.current ?? Date.now()));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isRunning]);

  const startTimer = () => {
    setElapsed(0);
    setIsRunning(true);
  };

  const stopTimer = () => {
    setIsRunning(false);
    const minutes = Math.max(1, Math.floor(elapsed / 60000));
    addMeditationMinutes(minutes);
    setElapsed(0);
  };

  const pct = Math.min((elapsed / (targetMinutes * 60 * 1000)) * 100, 100);
  const targetReached = elapsed >= targetMinutes * 60 * 1000;

  const handleSaveGratitude = () => {
    if (!draft.trim()) return;
    update({ gratitude: draft.trim() });
    setSaved(true);
    setEditing(false);
  };

  const loadHistory = () => {
    const all = getAllDays();
    const today = new Date().toISOString().split('T')[0];
    setHistoryDays(all.filter(d => d.date !== today && d.gratitude));
    setShowHistory(true);
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-violet-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-500 to-violet-400 px-6 pt-14 pb-8 text-white" style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))' }}>
        <p className="text-violet-200 text-sm font-medium mb-1">{today}</p>
        <h1 className="text-3xl font-bold">Mind</h1>
        <p className="text-violet-200 text-sm mt-1">
          {data.meditationMinutes > 0
            ? `${data.meditationMinutes} min meditated today`
            : 'Ready to find your calm?'}
        </p>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Gratitude */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-4">
            <Heart size={20} className="text-violet-500" />
            <h2 className="text-lg font-bold text-stone-800">Daily Gratitude</h2>
          </div>

          {saved && !editing ? (
            <div>
              <div className="bg-violet-50 rounded-2xl p-4 text-stone-700 text-sm leading-relaxed italic">
                "{data.gratitude}"
              </div>
              <button
                onClick={() => { setEditing(true); setDraft(data.gratitude); }}
                className="mt-2 text-sm text-violet-500 font-medium"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="What are you grateful for today?"
                rows={4}
                className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <button
                onClick={handleSaveGratitude}
                disabled={!draft.trim()}
                className="w-full bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-2xl py-3 transition-colors disabled:opacity-40"
              >
                Save
              </button>
            </div>
          )}
        </section>

        {/* Meditation Timer */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
          <h2 className="text-lg font-bold text-stone-800 mb-4">Meditation</h2>

          {/* Target presets */}
          {!isRunning && (
            <div className="flex gap-2 mb-5">
              {PRESETS.map(m => (
                <button
                  key={m}
                  onClick={() => setTargetMinutes(m)}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                    targetMinutes === m
                      ? 'bg-violet-500 text-white'
                      : 'bg-violet-50 text-violet-500'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          )}

          {/* Timer ring */}
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-44 h-44">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="70" fill="none" stroke="#F3E8FF" strokeWidth="10" />
                <circle
                  cx="80" cy="80" r="70"
                  fill="none"
                  stroke={targetReached ? '#10B981' : '#A855F7'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - pct / 100)}`}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-stone-800 tabular-nums">
                  {formatDuration(elapsed)}
                </span>
                {isRunning && (
                  <span className="text-xs text-stone-400 mt-1">
                    {targetReached ? 'Goal reached!' : `Goal: ${targetMinutes}m`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {!isRunning ? (
                <button
                  onClick={startTimer}
                  className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-full px-8 py-3.5 transition-colors"
                >
                  <Play size={18} fill="white" /> Start
                </button>
              ) : (
                <button
                  onClick={stopTimer}
                  className="flex items-center gap-2 bg-stone-700 hover:bg-stone-800 text-white font-semibold rounded-full px-8 py-3.5 transition-colors"
                >
                  <Square size={18} fill="white" /> Done
                </button>
              )}
            </div>

            {data.meditationMinutes > 0 && (
              <p className="text-sm text-violet-500 font-medium">
                Today: {data.meditationMinutes} min total
              </p>
            )}
          </div>
        </section>

        {/* Gratitude History */}
        <section>
          <button
            onClick={showHistory ? () => setShowHistory(false) : loadHistory}
            className="w-full flex items-center justify-between bg-white rounded-3xl px-5 py-4 shadow-sm border border-stone-100"
          >
            <span className="font-semibold text-stone-700">Past Gratitude Entries</span>
            {showHistory ? <ChevronUp size={18} className="text-stone-400" /> : <ChevronDown size={18} className="text-stone-400" />}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-2">
              {historyDays.length === 0 ? (
                <p className="text-center text-sm text-stone-400 py-4">No past entries yet</p>
              ) : (
                historyDays.map(d => (
                  <div key={d.date} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-stone-100">
                    <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-1">
                      {formatDate(d.date)}
                    </p>
                    <p className="text-sm text-stone-600 italic">"{d.gratitude}"</p>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
