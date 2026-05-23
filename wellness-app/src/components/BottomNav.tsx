import { NavLink, useLocation } from 'react-router-dom';
import { Salad, Brain, Dumbbell } from 'lucide-react';

const tabs = [
  { to: '/', icon: Salad, label: 'Nutrition' },
  { to: '/mind', icon: Brain, label: 'Mind' },
  { to: '/move', icon: Dumbbell, label: 'Move' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-stone-100" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${
                isActive ? 'text-orange-500' : 'text-stone-400'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
