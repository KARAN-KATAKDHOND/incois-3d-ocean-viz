import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Waves, Lock, Mail, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleFormSubmit = (e) => {
    e.preventDefault();
    login('Operational Forecaster', email || 'forecaster@incois.gov.in');
    navigate('/dashboard');
  };

  const handleQuickLogin = (role) => {
    login(role, `${role.toLowerCase().replace(' ', '')}@incois.gov.in`);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-3">
            <Waves className="text-blue-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold">System Access</h2>
          <p className="text-xs text-slate-400 mt-1">INCOIS Operational Portal</p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Officer Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@incois.gov.in"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Security Key / Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck size={18} />
            Authenticate Session
          </button>
        </form>

        {/* Demo Quick Logins for Judges */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-500 font-semibold uppercase mb-3 text-center">Evaluation Quick Access</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickLogin('Operational Forecaster')}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <UserCheck size={14} className="text-blue-400" />
              Forecaster
            </button>
            <button
              onClick={() => handleQuickLogin('Research Analyst')}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <UserCheck size={14} className="text-emerald-400" />
              Analyst
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}