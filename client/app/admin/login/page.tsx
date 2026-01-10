"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Verificare HARDCODED (Fără API)
    if (password === 'concert2025') {
      
      // 2. Setăm token-ul pe care îl așteaptă Scanner-ul
      // Folosim cheia "adminToken" pe care o caută pagina de scanare
      localStorage.setItem('adminToken', 'admin-logged-in-securely');
      
      // 3. Redirecționare către Scanner
      router.push('/admin/dashboard');
      
    } else {
      setError('Parolă incorectă');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0905] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#14120c] border border-yellow-900/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-900 via-yellow-500 to-yellow-900"></div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[#faeacc] mb-2">Admin Access</h1>
          <p className="text-yellow-600/60 text-sm font-bold uppercase tracking-widest">Doar personal autorizat</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2 ml-1">
              Parolă Securitate
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0905] border border-yellow-900/30 text-[#faeacc] text-center text-2xl tracking-[0.5em] placeholder-yellow-900/20 rounded-xl px-4 py-4 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 outline-none transition-all"
              placeholder="••••••"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm font-bold text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <button 
            type="submit"
            className="w-full h-14 bg-yellow-500 text-black font-black text-lg uppercase tracking-wider rounded-xl hover:bg-[#faeacc] transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">lock_open</span>
            Autentificare
          </button>
        </form>
      </div>
    </div>
  );
}