import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import NutritionPage from './pages/NutritionPage';
import MentalPage from './pages/MentalPage';
import ExercisePage from './pages/ExercisePage';

export default function App() {
  return (
    <div className="max-w-lg mx-auto relative min-h-screen">
      <Routes>
        <Route path="/" element={<NutritionPage />} />
        <Route path="/mind" element={<MentalPage />} />
        <Route path="/move" element={<ExercisePage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
