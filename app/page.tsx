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

  useEffect(() => {
    const stored = localStorage.getItem('wc_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

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

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">⚽</div>
            <h1 className="text-2xl font-bold text-white">MS 2026 Tipovačka</h1>
            <p className="text-slate-400 text-sm mt-1">Zadej přezdívku a tipuj!</p>
          </div>
          <input
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <h1 className="font-bold text-white">MS 2026 Tipovačka</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300">👤 {user.nickname}</span>
          <button
            onClick={() => { localStorage.removeItem('wc_user'); setUser(null); setNickname(''); }}
            className="text-xs text-slate-400 hover:text-white underline"
          >
            Odhlásit
          </button>
        </div>
      </header>

      <nav className="bg-slate-800 border-b border-slate-700 flex">
        <button
          onClick={() => setTab('tips')}
          className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
            tab === 'tips' ? 'border-green-500 text-green-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🎯 Moje tipy
        </button>
        <button
          onClick={() => setTab('leaderboard')}
          className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
            tab === 'leaderboard' ? 'border-green-500 text-green-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🏆 Tabulka
        </button>
      </nav>

      <main className="max-w-2xl mx-auto w-full p-4">
        {tab === 'tips' && <TipsSection userId={user.id} />}
        {tab === 'leaderboard' && <Leaderboard currentUserId={user.id} />}
      </main>
    </div>
  );
}
