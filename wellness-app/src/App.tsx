import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import MomentumPage from './pages/MomentumPage';
import TodayPage from './pages/TodayPage';

export default function App() {
  return (
    <div className="max-w-lg mx-auto relative min-h-screen">
      <Routes>
        <Route path="/"      element={<MomentumPage />} />
        <Route path="/today" element={<TodayPage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
