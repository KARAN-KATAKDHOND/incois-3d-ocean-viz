import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GlobeLanding } from './pages/GlobeLanding';
import { OceanExplorer } from './pages/OceanExplorer';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GlobeLanding />} />
        <Route path="/visualization" element={<OceanExplorer />} />
        <Route path="/dashboard" element={<Navigate to="/visualization" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
