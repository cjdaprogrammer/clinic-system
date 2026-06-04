'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

import {
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('Session check warning:', error.message);
          setCheckingSession(false);
          return;
        }

        if (data.session) {
          router.push('/');
          return;
        }

        setCheckingSession(false);
      } catch (err) {
        console.warn('Session check failed:', err);
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMessage('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (!rememberMe) {
        // Optional: signs out when browser/tab session expires is not automatic in Supabase.
        // Keep checked for normal clinic staff usage.
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      console.warn('Login failed:', err);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-black">
          <Loader2 className="animate-spin" />
          Checking session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-[#14B8A6]" />

      <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-100 rounded-full blur-3xl opacity-60" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60" />

      <div className="bg-white p-10 rounded-3xl shadow-xl shadow-blue-900/5 w-full max-w-md border border-slate-100 relative z-10">

        <div className="flex flex-col items-center mb-10">
          <div className="mb-4 drop-shadow-md">
            <img
              src="/qnhs_logo.png"
              alt="QNHS Logo"
              className="w-24 h-24 object-contain"
            />
          </div>

          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            QNHS Clinic
          </h1>

          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">
            Health Information System
          </p>

          <p className="text-slate-400 text-xs mt-2 font-bold">
            Quezon National High School
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Nurse Email
            </label>

            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-300" size={18} />

              <input
                type="email"
                required
                disabled={loading}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-2 focus:ring-[#14B8A6] focus:bg-white outline-none transition-all disabled:opacity-60"
                placeholder="nurse@qnhs.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Password
            </label>

            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-300" size={18} />

              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-2 focus:ring-[#14B8A6] focus:bg-white outline-none transition-all disabled:opacity-60"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm font-bold text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-[#14B8A6]"
            />
            Remember this device
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#14B8A6] text-white font-black py-4 rounded-2xl hover:bg-[#0D9488] active:scale-95 transition-all shadow-lg shadow-teal-200 flex items-center justify-center gap-3 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Signing In...
              </>
            ) : (
              <>
                <ShieldCheck size={20} />
                Access Dashboard
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <p className="text-slate-400 text-xs font-bold">
            QNHS Clinic Information System v2.0
          </p>

          <p className="text-slate-400 text-xs mt-1">
            Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
}