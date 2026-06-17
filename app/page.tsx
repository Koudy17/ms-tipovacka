'use client';

import { useState, useEffect, useCallback } from 'react';
import TipsSection from '@/components/TipsSection';
import Leaderboard from '@/components/Leaderboard';
import { checkPassword } from '@/lib/passwordPolicy';

interface User {
  id: number;
  nickname: string;
  mustChangePassword?: boolean;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [changePwdState, setChangePwdState] = useState<{ newPwd: string; confirmPwd: string; error: string; loading: boolean }>({ newPwd: '', confirmPwd: '', error: '', loading: false });
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
    if (!password) {
      setError('Zadej heslo.');
      return;
    }
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: nickname.trim(), password }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    localStorage.setItem('wc_user', JSON.stringify(data));
    setUser(data);
  }, [nickname, password]);

  const handleChangePassword = async () => {
    if (changePwdState.newPwd.length < 3) {
      setChangePwdState(s => ({ ...s, error: 'Heslo musí mít alespoň 3 znaky.' }));
      return;
    }
    if (changePwdState.newPwd !== changePwdState.confirmPwd) {
      setChangePwdState(s => ({ ...s, error: 'Hesla se neshodují.' }));
      return;
    }
    setChangePwdState(s => ({ ...s, loading: true, error: '' }));
    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user!.id, currentPassword: password, newPassword: changePwdState.newPwd }),
    });
    const data = await res.json();
    if (data.error) {
      setChangePwdState(s => ({ ...s, loading: false, error: data.error }));
      return;
    }
    const updated = { ...user!, mustChangePassword: false };
    localStorage.setItem('wc_user', JSON.stringify(updated));
    setUser(updated);
  };

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
            <div className="flex items-center justify-center gap-2 mt-2 mb-1">
              <img src="/flags/us.png" alt="USA" className="h-4 rounded-sm opacity-90" />
              <img src="/flags/ca.png" alt="Kanada" className="h-4 rounded-sm opacity-90" />
              <img src="/flags/mx.png" alt="Mexiko" className="h-4 rounded-sm opacity-90" />
            </div>
            <p className={`${t.mutedText} text-sm mt-1`}>Přihlás se a tipuj!</p>
          </div>
          <input
            className={`w-full ${dark ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 mb-2`}
            placeholder="Přezdívka"
            value={nickname}
            onChange={e => { setNickname(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            maxLength={30}
          />
          <input
            type="password"
            className={`w-full ${dark ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 mb-3`}
            placeholder="Heslo"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg py-2 transition"
          >
            Přihlásit se
          </button>
          <p className="text-center text-green-500 text-xs mt-4 opacity-80">
            ⚽ MS 2026 právě probíhá!
          </p>
        </div>
      </div>
    );
  }

  if (user?.mustChangePassword) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-green-950' : 'bg-gradient-to-br from-gray-100 via-gray-100 to-green-50'}`}>
        <div className={`${dark ? 'bg-slate-800' : 'bg-white'} border border-yellow-500 rounded-2xl shadow-2xl p-8 w-full max-w-sm`}
          style={{ boxShadow: '0 0 24px 2px rgba(234,179,8,0.18)' }}>
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔑</div>
            <h1 className={`text-xl font-bold ${t.headerText}`}>Nastav si vlastní heslo</h1>
            <p className={`${t.mutedText} text-sm mt-1`}>Přihlásil ses poprvé — změň si dočasné heslo.</p>
          </div>
          <input
            type="password"
            className={`w-full ${dark ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-2`}
            placeholder="Nové heslo"
            value={changePwdState.newPwd}
            onChange={e => setChangePwdState(s => ({ ...s, newPwd: e.target.value, error: '' }))}
            onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
          />
          {changePwdState.newPwd && (
            <div className="mb-2 space-y-1">
              {checkPassword(changePwdState.newPwd).rules.map(r => (
                <div key={r.label} className={`flex items-center gap-1.5 text-xs ${r.valid ? 'text-green-400' : 'text-slate-500'}`}>
                  <span>{r.valid ? '✓' : '○'}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          )}
          <input
            type="password"
            className={`w-full ${dark ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-3`}
            placeholder="Zopakuj nové heslo"
            value={changePwdState.confirmPwd}
            onChange={e => setChangePwdState(s => ({ ...s, confirmPwd: e.target.value, error: '' }))}
            onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
          />
          {changePwdState.error && <p className="text-red-400 text-sm mb-2">{changePwdState.error}</p>}
          <button
            onClick={handleChangePassword}
            disabled={changePwdState.loading}
            className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2 transition"
          >
            {changePwdState.loading ? 'Ukládám…' : 'Uložit heslo'}
          </button>
          <button
            onClick={() => { localStorage.removeItem('wc_user'); setUser(null); setPassword(''); }}
            className={`w-full mt-2 text-xs ${t.mutedText} hover:text-white underline`}
          >
            Odhlásit se
          </button>
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
        {tab === 'tips' && <TipsSection userId={user.id} dark={dark} onSessionExpired={async () => { await fetch('/api/users/logout', { method: 'POST' }); localStorage.removeItem('wc_user'); setUser(null); }} />}
        {tab === 'leaderboard' && <Leaderboard currentUserId={user.id} dark={dark} />}
      </main>
    </div>
  );
}
