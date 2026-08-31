import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import MapCanvas from '../components/MapCanvas';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-white">
      {/* Mobile Header Navigation */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800 p-4 flex justify-between items-center">
        <span className="font-bold text-lg tracking-wide">INCOIS <span className="text-blue-500">3D</span></span>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-slate-800 rounded-md text-slate-300 hover:text-white"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Overlay Background */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container (Responsive) */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main 3D Canvas Area */}
      <div className="flex-1 mt-[68px] md:mt-0 relative w-full h-full">
        <MapCanvas />
      </div>
    </div>
  );
}