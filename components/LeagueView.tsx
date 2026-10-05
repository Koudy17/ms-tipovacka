'use client';

import { useEffect, useState } from 'react';
import FormChips from '@/components/FormChips';

interface Standing {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  form: string | null;
  description: string | null;
  all: { played: number };
}
interface TopScorer {
  player: { id: number; name: string; photo: string };
  team: { id: number; name: string; logo: string };
  goals: number;
  assists: number;
  played: number;
}
interface LeagueData { standings: Standing[]; topScorers: TopScorer[]; updatedAt: string }

function zone(desc: string | null): { bar: string; label: string } | null {
  if (!desc) return null;
  if (desc.includes('Champions League')) return { bar: 'border-l-blue-500', label: 'Liga mistrů' };
  if (desc.includes('Europa League')) return { bar: 'border-l-orange-500', label: 'Evropská liga' };
  if (desc.includes('Conference')) return { bar: 'border-l-teal-500', label: 'Konferenční liga' };
  if (desc.includes('Relegation')) return { bar: 'border-l-red-600', label: 'Sestup' };
  return null;
}

const COLS = '1.6rem 1fr 1.6rem 2rem 2rem 5.2rem';

export default function LeagueView({ dark }: { dark: boolean }) {
  const [data, setData] = useState<LeagueData | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<'table' | 'scorers'>('table');

  useEffect(() => {
    fetch('/api/league')
      .then(async r => (r.ok ? setData(await r.json()) : setError((await r.json().catch(() => ({}))).error ?? 'Data se nepodařilo načíst.')))
      .catch(() => setError('Data se nepodařilo načíst.'));
  }, []);

  const d = {
    sub: dark ? 'text-slate-400' : 'text-gray-500',
    card: dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    row: dark ? 'border-slate-700' : 'border-gray-100',
    text: dark ? 'text-slate-100' : 'text-gray-900',
    btn: (a: boolean) => a ? 'bg-green-500 text-white' : dark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300',
  };

  if (error) return <p className="text-center text-red-400 py-10">{error}</p>;
  if (!data) return <p className={`text-center py-10 ${d.sub}`}>Načítám…</p>;

  const zones: { bar: string; label: string }[] = [];
  for (const s of data.standings) {
    const z = zone(s.description);
    if (z && !zones.some(x => x.label === z.label)) zones.push(z);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setView('table')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${d.btn(view === 'table')}`}>📊 Tabulka</button>
        <button onClick={() => setView('scorers')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${d.btn(view === 'scorers')}`}>⚽ Střelci</button>
      </div>

      {view === 'table' && (
        <div className={`rounded-xl border overflow-hidden ${d.card}`}>
          <div className={`grid items-center text-[10px] uppercase tracking-wider px-2 py-2 border-b border-l-4 border-l-transparent ${d.row} ${d.sub}`} style={{ gridTemplateColumns: COLS }}>
            <span className="text-center">#</span><span>Klub</span><span className="text-center">Z</span><span className="text-center">+/−</span><span className="text-center">B</span><span className="text-right pr-1">Forma</span>
          </div>
          {data.standings.map(s => {
            const z = zone(s.description);
            return (
              <div key={s.team.id} className={`grid items-center px-2 py-1.5 border-b last:border-b-0 border-l-4 ${d.row} ${z ? z.bar : 'border-l-transparent'} ${d.text}`} style={{ gridTemplateColumns: COLS }}>
                <span className={`text-xs text-center ${d.sub}`}>{s.rank}</span>
                <span className="flex items-center gap-1.5 min-w-0 text-sm font-semibold">
                  <img src={s.team.logo} alt="" className="h-5 w-5 object-contain shrink-0" loading="lazy" />
                  <span className="truncate">{s.team.name}</span>
                </span>
                <span className={`text-xs text-center ${d.sub}`}>{s.all.played}</span>
                <span className={`text-xs text-center ${d.sub}`}>{s.goalsDiff > 0 ? `+${s.goalsDiff}` : s.goalsDiff}</span>
                <span className="text-sm text-center font-bold">{s.points}</span>
                <span className="text-right"><FormChips form={s.form} /></span>
              </div>
            );
          })}
        </div>
      )}

      {view === 'table' && zones.length > 0 && (
        <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[11px] ${d.sub}`}>
          {zones.map(z => (
            <span key={z.label} className="flex items-center gap-1.5"><span className={`inline-block h-3 border-l-4 ${z.bar}`} />{z.label}</span>
          ))}
        </div>
      )}

      {view === 'scorers' && (
        <div className={`rounded-xl border overflow-hidden ${d.card}`}>
          {data.topScorers.map((p, i) => (
            <div key={p.player.id} className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 ${d.row} ${d.text}`}>
              <span className={`w-5 text-center text-xs ${d.sub}`}>{i + 1}</span>
              <img src={p.player.photo} alt="" className="h-10 w-10 rounded-full object-cover bg-slate-600 shrink-0" loading="lazy" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.player.name}</div>
                <div className={`flex items-center gap-1 text-xs ${d.sub}`}>
                  <img src={p.team.logo} alt="" className="h-3.5 w-3.5 object-contain" loading="lazy" />
                  <span className="truncate">{p.team.name}</span> · {p.played} z.
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold leading-none">{p.goals}<span className="text-xs ml-0.5">⚽</span></div>
                <div className={`text-[10px] ${d.sub}`}>{p.assists} asist.</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className={`text-[10px] text-right ${d.sub}`}>Data: API-Football · aktualizováno {new Date(data.updatedAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  );
}
