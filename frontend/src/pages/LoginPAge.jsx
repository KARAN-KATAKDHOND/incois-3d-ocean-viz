import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Waves,
  Lock,
  Mail,
  UserCheck,
  Globe,
  AlertCircle,
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Email + Password Login
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setIsLoading(true);

      await login(email, password);

      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);

      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Invalid email or password.');
          break;

        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;

        case 'auth/too-many-requests':
          setError(
            'Too many failed attempts. Please try again later.'
          );
          break;

        case 'auth/network-request-failed':
          setError(
            'Network error. Please check your internet connection.'
          );
          break;

        default:
          setError('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    setError('');

    try {
      setIsLoading(true);

      await loginWithGoogle();

      navigate('/dashboard');
    } catch (error) {
      console.error('Google login failed:', error);

      if (error.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled.');
      } else if (error.code === 'auth/popup-blocked') {
        setError(
          'Google sign-in popup was blocked. Please allow popups for this site.'
        );
      } else if (
        error.code === 'auth/account-exists-with-different-credential'
      ) {
        setError(
          'An account already exists with this email using another sign-in method.'
        );
      } else {
        setError('Google authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col justify-center items-center px-4 relative overflow-hidden">

      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-3">
            <Waves className="text-blue-500" size={32} />
          </div>

          <h2 className="text-2xl font-bold">
            System Access
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            INCOIS Operational Portal
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-5 flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle
              size={18}
              className="text-red-400 mt-0.5 flex-shrink-0"
            />

            <p className="text-xs text-red-300">
              {error}
            </p>
          </div>
        )}

        {/* Email + Password Form */}
        <form
          onSubmit={handleFormSubmit}
          className="space-y-4"
        >

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Officer Email
            </label>

            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@incois.gov.in"
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Security Key / Password
            </label>

            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* Email Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck size={18} />

            {isLoading
              ? 'Authenticating...'
              : 'Authenticate Session'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>

          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-900 px-3 text-slate-500">
              OR
            </span>
          </div>
        </div>

        {/* Google Login */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-white hover:bg-slate-100 disabled:bg-slate-300 disabled:cursor-not-allowed text-slate-900 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Globe size={18} />

          {isLoading
            ? 'Connecting...'
            : 'Continue with Google'}
        </button>

        {/* Demo Quick Logins */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-500 font-semibold uppercase mb-3 text-center">
            Evaluation Quick Access
          </p>

          <div className="grid grid-cols-2 gap-3">

            {/* Forecaster */}
            <button
              type="button"
              disabled
              className="px-3 py-2 bg-slate-800/40 border border-slate-700 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <UserCheck
                size={14}
                className="text-blue-400"
              />

              Forecaster
            </button>

            {/* Analyst */}
            <button
              type="button"
              disabled
              className="px-3 py-2 bg-slate-800/40 border border-slate-700 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <UserCheck
                size={14}
                className="text-emerald-400"
              />

              Analyst
            </button>

          </div>

          <p className="text-[10px] text-slate-600 text-center mt-3">
            Demo access will be enabled after Firebase authentication
            is configured.
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            Authorized access only. Authentication is secured through
            Firebase Authentication.
          </p>
        </div>

      </div>
    </div>
  );
}

