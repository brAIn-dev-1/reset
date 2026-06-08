import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import MomentumPage from './pages/MomentumPage';
import NutritionPage from './pages/NutritionPage';
import ExercisePage from './pages/ExercisePage';

export default function App() {
  return (
    <div className="max-w-lg mx-auto relative min-h-screen">
      <Routes>
        <Route path="/"          element={<MomentumPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/body"      element={<ExercisePage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
