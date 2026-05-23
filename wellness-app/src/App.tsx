import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import MomentumPage from './pages/MomentumPage';
import NutritionPage from './pages/NutritionPage';
import MentalPage from './pages/MentalPage';
import ExercisePage from './pages/ExercisePage';
import CommunityPage from './pages/CommunityPage';

export default function App() {
  return (
    <div className="max-w-lg mx-auto relative min-h-screen">
      <Routes>
        <Route path="/"          element={<MomentumPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/mind"      element={<MentalPage />} />
        <Route path="/body"      element={<ExercisePage />} />
        <Route path="/community" element={<CommunityPage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
