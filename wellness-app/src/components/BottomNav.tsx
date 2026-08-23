import { NavLink, useLocation } from 'react-router-dom';
import { TrendingUp, CalendarDays } from 'lucide-react';

const tabs = [
  { to: '/',      icon: TrendingUp,   label: 'Momentum', exact: true  },
  { to: '/today', icon: CalendarDays, label: 'Today',    exact: false },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-stone-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-orange-500' : 'text-stone-400'
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[8px] font-semibold tracking-wide">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
