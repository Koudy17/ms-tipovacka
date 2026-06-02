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
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">⚽</div>
            <h1 className="text-2xl font-bold text-green-900">MS 2026 Tipovačka</h1>
            <p className="text-gray-500 text-sm mt-1">Zadej přezdívku a tipuj!</p>
          </div>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
            placeholder="Tvoje přezdívka"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            maxLength={30}
          />
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg py-2 transition"
          >
            Vstoupit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <h1 className="font-bold text-lg">MS 2026 Tipovačka</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-green-200">👤 {user.nickname}</span>
          <button
            onClick={() => { localStorage.removeItem('wc_user'); setUser(null); setNickname(''); }}
            className="text-xs text-green-300 hover:text-white underline"
          >
            Odhlásit
          </button>
        </div>
      </header>

      <nav className="bg-white border-b flex">
        <button
          onClick={() => setTab('tips')}
          className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
            tab === 'tips' ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🎯 Moje tipy
        </button>
        <button
          onClick={() => setTab('leaderboard')}
          className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
            tab === 'leaderboard' ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🏆 Tabulka
        </button>
      </nav>

      <main className="max-w-2xl mx-auto p-4">
        {tab === 'tips' && <TipsSection userId={user.id} />}
        {tab === 'leaderboard' && <Leaderboard currentUserId={user.id} />}
      </main>
    </div>
  );
}
