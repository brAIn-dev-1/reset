interface ProgressBarProps {
  value: number;
  max: number;
  color: string; // tailwind bg class e.g. 'bg-orange-500'
  overColor?: string;
  label: string;
  unit: string;
  showOver?: boolean;
}

export default function ProgressBar({ value, max, color, overColor = 'bg-red-400', label, unit, showOver }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const isOver = value > max;
  const overAmount = value - max;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-semibold text-stone-500 uppercase tracking-wide">{label}</span>
        <span className={`text-sm font-bold ${isOver ? 'text-red-500' : 'text-stone-700'}`}>
          {value.toLocaleString()} / {max.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isOver ? overColor : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showOver && isOver && (
        <p className="text-xs text-red-500 font-medium">
          +{overAmount.toLocaleString()} {unit} over goal
        </p>
      )}
    </div>
  );
}
