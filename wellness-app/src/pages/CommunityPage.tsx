import { Heart, Handshake, Users } from 'lucide-react';
import { useDailyData } from '../hooks/useDailyData';

type YesNo = boolean | null;

interface ActivityRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: YesNo;
  onChange: (v: YesNo) => void;
}

function ActivityRow({ icon, label, description, value, onChange }: ActivityRowProps) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-stone-100 last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
        <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-400 flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-stone-700 text-sm">{label}</p>
          <p className="text-xs text-stone-400 truncate">{description}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => onChange(value === true ? null : true)}
          className={`w-14 h-9 rounded-xl text-sm font-semibold transition-colors ${
            value === true ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-400'
          }`}
        >
          Yes
        </button>
        <button
          onClick={() => onChange(value === false ? null : false)}
          className={`w-14 h-9 rounded-xl text-sm font-semibold transition-colors ${
            value === false ? 'bg-red-400 text-white' : 'bg-stone-100 text-stone-400'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const { data, update } = useDailyData();

  const score = [data.connection, data.helpedSomeone, data.volunteered]
    .filter(v => v === true).length;

  const subtitle =
    score === 0 ? 'How did you show up for others today?'
    : score === 1 ? 'Good start — keep connecting'
    : score === 2 ? 'You\'re making an impact today'
    : 'You showed up for your community today 💛';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-rose-50 pb-24">
      {/* Header */}
      <div
        className="bg-gradient-to-br from-rose-500 to-rose-400 px-6 pb-8 text-white"
        style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))' }}
      >
        <p className="text-rose-100 text-sm font-medium mb-1">{today}</p>
        <h1 className="text-3xl font-bold">Community</h1>
        <p className="text-rose-100 text-sm mt-1">{subtitle}</p>
      </div>

      <div className="px-4 pt-5 space-y-5">
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
          <h2 className="text-lg font-bold text-stone-800 mb-1">Today's Check-in</h2>
          <p className="text-sm text-stone-400 mb-4">Did you do any of these today?</p>

          <ActivityRow
            icon={<Heart size={18} />}
            label="Genuine Connection"
            description="A real conversation, not just small talk"
            value={data.connection}
            onChange={v => update({ connection: v })}
          />
          <ActivityRow
            icon={<Handshake size={18} />}
            label="Helped Someone"
            description="Lent a hand, gave advice, or offered support"
            value={data.helpedSomeone}
            onChange={v => update({ helpedSomeone: v })}
          />
          <ActivityRow
            icon={<Users size={18} />}
            label="Volunteered"
            description="Gave time or energy to something bigger"
            value={data.volunteered}
            onChange={v => update({ volunteered: v })}
          />
        </section>

        {/* Summary chips */}
        {score > 0 && (
          <div className="flex gap-2 flex-wrap">
            {data.connection === true && (
              <div className="flex items-center gap-1.5 bg-rose-100 text-rose-600 rounded-full px-3 py-1.5 text-sm font-medium">
                <Heart size={12} /> Connected
              </div>
            )}
            {data.helpedSomeone === true && (
              <div className="flex items-center gap-1.5 bg-rose-100 text-rose-600 rounded-full px-3 py-1.5 text-sm font-medium">
                <Handshake size={12} /> Helped
              </div>
            )}
            {data.volunteered === true && (
              <div className="flex items-center gap-1.5 bg-rose-100 text-rose-600 rounded-full px-3 py-1.5 text-sm font-medium">
                <Users size={12} /> Volunteered
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
