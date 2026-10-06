'use client';

import { useState, useEffect } from 'react';
import { checkPassword } from '@/lib/passwordPolicy';
import Rules from '@/components/Rules';

export interface AuthUser {
  id: number;
  nickname: string;
  mustChangePassword?: boolean;
}

type Mode = 'login' | 'register' | 'forgot' | 'reset';

interface Props {
  dark: boolean;
  /** Voláno po úspěšném přihlášení/registraci/obnově hesla; password je to, co uživatel zadal */
  onAuthed: (user: AuthUser, password: string) => void;
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ error: 'Chyba spojení se serverem.' }));
}

export default function AuthCard({ dark, onAuthed }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [showRules, setShowRules] = useState(false);

  // Odkaz z e-mailu: /?reset=<token>
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('reset');
    if (token) {
      setResetToken(token);
      setMode('reset');
      window.history.replaceState(null, '', window.location.pathname); // token nenechávat v adrese
    }
  }, []);

  const go = (m: Mode) => { setMode(m); setError(''); setInfo(''); };
  const policy = checkPassword(password);

  const submit = async () => {
    setError(''); setInfo('');
    setBusy(true);
    try {
      if (mode === 'login') {
        if (nickname.trim().length < 2) return setError('Přezdívka musí mít alespoň 2 znaky.');
        if (!password) return setError('Zadej heslo.');
        const data = await post('/api/users', { nickname: nickname.trim(), password });
        if (data.error) return setError(data.error);
        onAuthed(data, password);
      } else if (mode === 'register') {
        const data = await post('/api/users/register', { email, nickname, password });
        if (data.error) return setError(data.error);
        onAuthed(data, password);
      } else if (mode === 'forgot') {
        const data = await post('/api/users/forgot', { email });
        if (data.error) return setError(data.error);
        setInfo('Pokud je tenhle e-mail u nás registrovaný, poslali jsme na něj odkaz pro nastavení nového hesla. Platí hodinu.');
      } else {
        const data = await post('/api/users/reset', { token: resetToken, password });
        if (data.error) return setError(data.error);
        onAuthed(data, password);
      }
    } finally {
      setBusy(false);
    }
  };

  const inputCls = `w-full ${dark ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 mb-2`;
  const muted = dark ? 'text-slate-400' : 'text-gray-500';
  const linkCls = 'text-green-500 hover:text-green-400 underline underline-offset-2';
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !busy) submit(); };

  const title = { login: 'Přihlásit se a tipovat!', register: 'Vytvoř si účet', forgot: 'Zapomenuté heslo', reset: 'Nastav si nové heslo' }[mode];
  const button = { login: 'Přihlásit se', register: 'Zaregistrovat se', forgot: 'Poslat odkaz', reset: 'Uložit heslo a přihlásit' }[mode];
  const showPolicy = (mode === 'register' || mode === 'reset') && password.length > 0;

  return (
    <div className={`${dark ? 'bg-slate-800' : 'bg-white'} border border-green-500 rounded-2xl shadow-2xl p-8 w-full max-w-sm`}
      style={{ boxShadow: '0 0 24px 2px rgba(34,197,94,0.18)' }}>
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">⚽</div>
        <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Premier League Tipovačka</h1>
        <p className={`${muted} text-sm mt-1`}>{title}</p>
      </div>

      {(mode === 'login' || mode === 'register') && (
        <>
          {mode === 'register' && (
            <input className={inputCls} type="email" autoComplete="email" placeholder="E-mail"
              value={email} onChange={e => { setEmail(e.target.value); setError(''); }} onKeyDown={onEnter} maxLength={254} />
          )}
          <input className={inputCls} autoComplete="username" placeholder="Přezdívka"
            value={nickname} onChange={e => { setNickname(e.target.value); setError(''); }} onKeyDown={onEnter} maxLength={30} />
        </>
      )}
      {mode === 'forgot' && (
        <input className={inputCls} type="email" autoComplete="email" placeholder="E-mail, se kterým ses registroval"
          value={email} onChange={e => { setEmail(e.target.value); setError(''); }} onKeyDown={onEnter} maxLength={254} />
      )}
      {mode !== 'forgot' && (
        <input className={inputCls} type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder={mode === 'login' ? 'Heslo' : 'Nové heslo'}
          value={password} onChange={e => { setPassword(e.target.value); setError(''); }} onKeyDown={onEnter} />
      )}

      {showPolicy && (
        <ul className="text-xs mb-2 space-y-0.5">
          {policy.rules.map(r => (
            <li key={r.label} className={r.valid ? 'text-green-500' : muted}>{r.valid ? '✓' : '○'} {r.label}</li>
          ))}
        </ul>
      )}

      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
      {info && <p className="text-green-500 text-sm mb-2">{info}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="w-full mt-1 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-semibold rounded-lg py-2 transition"
      >
        {busy ? '⏳ …' : button}
      </button>

      <div className={`text-center text-sm mt-4 space-y-1 ${muted}`}>
        {mode === 'login' && (
          <>
            <p>Nemáš účet? <button className={linkCls} onClick={() => go('register')}>Zaregistruj se</button></p>
            <p><button className={linkCls} onClick={() => go('forgot')}>Zapomenuté heslo?</button></p>
          </>
        )}
        {mode === 'register' && <p>Už máš účet? <button className={linkCls} onClick={() => go('login')}>Přihlásit se</button></p>}
        {(mode === 'forgot' || mode === 'reset') && <p><button className={linkCls} onClick={() => go('login')}>Zpět na přihlášení</button></p>}
      </div>

      <p className="text-center text-xs mt-3"><button className={linkCls} onClick={() => setShowRules(true)}>📖 Pravidla hry</button></p>
      <p className="text-center text-green-500 text-xs mt-3 opacity-80">⚽ Sezóna 2026/27 právě probíhá!</p>
      {showRules && <Rules dark={dark} onClose={() => setShowRules(false)} />}
    </div>
  );
}
