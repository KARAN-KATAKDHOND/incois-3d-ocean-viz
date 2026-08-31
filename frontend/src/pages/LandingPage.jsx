import { useNavigate } from 'react-router-dom';
import { Waves, Activity, Globe2, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-white flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      
      <nav className="p-6 md:px-12 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <Waves className="text-blue-500" size={32} />
          <span className="text-xl font-bold tracking-wider">INCOIS <span className="text-blue-500">3D</span></span>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2 text-sm font-semibold border border-blue-500/50 hover:bg-blue-500/10 rounded-full transition-all"
        >
          System Login
        </button>
      </nav>

      <main className="flex-1 flex flex-col justify-center items-center px-6 text-center z-10 max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Next-Generation <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            Ocean Data Visualization
          </span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl mb-10 max-w-2xl">
          An interactive, browser-native 3D platform rendering high-resolution ocean models and real-time autonomous instrument profiles for rapid operational forecasting.
        </p>

        <button 
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] hover:shadow-[0_0_60px_-15px_rgba(59,130,246,0.7)]"
        >
          Launch Dashboard
          <ChevronRight className="group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full">
          {[
            { icon: Globe2, title: '3D Volumetric Rendering', desc: 'Interact with temperature and salinity models across the full water column.' },
            { icon: Activity, title: 'Instrument Overlay', desc: 'Co-display of Argo float and Glider profiles with geospatially accurate markers.' },
            { icon: Waves, title: 'Hazard Assessment', desc: 'Rapid intuitive analysis for search-and-rescue and operational decision-making.' }
          ].map((feature, idx) => (
            <div key={idx} className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-2xl text-left">
              <feature.icon className="text-blue-400 mb-4" size={28} />
              <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}