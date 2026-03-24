'use client'
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldCheck } from 'lucide-react'; 

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Login failed: " + error.message);
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
      
      <div className="bg-white p-10 rounded-3xl shadow-xl shadow-blue-900/5 w-full max-w-md border border-slate-100">
        
        {/* Clinic Header with QNHS Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-4 drop-shadow-md">
            <img 
                src="/qnhs_logo.png" 
                alt="QNHS Logo" 
                className="w-24 h-24 object-contain" 
            />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">QNHS Clinic</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Health Information System</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nurse Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-300" size={18} />
              <input 
                type="email"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                placeholder="nurse@qnhs.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-300" size={18} />
              <input 
                type="password"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying...' : (
              <>
                <ShieldCheck size={20} />
                Access Dashboard
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-50 pt-6">
          <p className="text-slate-400 text-xs font-medium">
            Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
}