'use client';

import { useState, useEffect, useCallback } from 'react';
import TipsSection from '@/components/TipsSection';
import Leaderboard from '@/components/Leaderboard';

interface User {
  id: number;
  nickname: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'tips' | 'leaderboard'>('tips');
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('wc_user');
    if (stored) setUser(JSON.parse(stored));
    const savedTheme = localStorage.getItem('wc_theme');
    if (savedTheme) setDark(savedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('wc_theme', next ? 'dark' : 'light');
  };

  const handleLogin = useCallback(async () => {
    if (nickname.trim().length < 2) {
      setError('Přezdívka musí mít alespoň 2 znaky.');
      return;
    }
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: nickname.trim() }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    localStorage.setItem('wc_user', JSON.stringify(data));
    setUser(data);
  }, [nickname]);

  // Témata
  const t = {
    bg: dark ? 'bg-slate-900' : 'bg-gray-100',
    header: dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    headerText: dark ? 'text-white' : 'text-gray-900',
    subText: dark ? 'text-slate-300' : 'text-gray-600',
    mutedText: dark ? 'text-slate-400' : 'text-gray-400',
    nav: dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    navActive: dark ? 'border-green-500 text-green-400' : 'border-green-600 text-green-700',
    navInactive: dark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-gray-500 hover:text-gray-700',
  };

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-green-950' : 'bg-gradient-to-br from-gray-100 via-gray-100 to-green-50'}`}>
        <div className={`${dark ? 'bg-slate-800' : 'bg-white'} border border-green-500 rounded-2xl shadow-2xl p-8 w-full max-w-sm`}
          style={{ boxShadow: '0 0 24px 2px rgba(34,197,94,0.18)' }}>
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">⚽</div>
            <h1 className={`text-2xl font-bold ${t.headerText}`}>MS 2026 Tipovačka</h1>
            <p className={`${t.mutedText} text-sm mt-1`}>Zadej přezdívku a tipuj!</p>
          </div>
          <input
            className={`w-full ${dark ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 mb-2`}
            placeholder="Tvoje přezdívka"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            maxLength={30}
          />
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg py-2 transition"
          >
            Vstoupit
          </button>
          <p className="text-center text-green-500 text-xs mt-4 opacity-80">
            ⏳ MS začíná za {Math.ceil((new Date('2026-06-11T19:00:00Z').getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dní
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${t.bg} flex flex-col`}>
      <header className={`${t.header} border-b px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <h1 className={`font-bold ${t.headerText}`}>MS 2026 Tipovačka</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className={`text-lg transition hover:scale-110`}
            title={dark ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <span className={`text-sm ${t.subText}`}>👤 {user.nickname}</span>
          <button
            onClick={() => { localStorage.removeItem('wc_user'); setUser(null); setNickname(''); }}
            className={`text-xs ${t.mutedText} hover:text-white underline`}
          >
            Odhlásit
          </button>
        </div>
      </header>

      <nav className={`${t.nav} border-b flex`}>
        <button
          onClick={() => setTab('tips')}
          className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${tab === 'tips' ? t.navActive : t.navInactive}`}
        >
          🎯 Moje tipy
        </button>
        <button
          onClick={() => setTab('leaderboard')}
          className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${tab === 'leaderboard' ? t.navActive : t.navInactive}`}
        >
          🏆 Tabulka
        </button>
      </nav>

      <main className="max-w-2xl mx-auto w-full p-4">
        {tab === 'tips' && <TipsSection userId={user.id} dark={dark} />}
        {tab === 'leaderboard' && <Leaderboard currentUserId={user.id} dark={dark} />}
      </main>
    </div>
  );
}
