import { Routes, Route, Navigate } from 'react-router-dom';
import TodayPage from './pages/TodayPage';

export default function App() {
  return (
    <div className="max-w-lg mx-auto relative min-h-screen">
      <Routes>
        <Route path="/"      element={<TodayPage />} />
        <Route path="*"      element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
