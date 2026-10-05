'use client';

import { useEffect, useState } from 'react';
import FormChips from '@/components/FormChips';

interface Info {
  home: { form: string | null; rank: number | null; points: number | null };
  away: { form: string | null; rank: number | null; points: number | null };
  h2h: { date: string; home: { id: number; name: string; goals: number | null }; away: { id: number; name: string; goals: number | null } }[];
}

const cache = new Map<string, Info>();

export default function MatchInfo(props: {
  homeId: number; awayId: number; homeName: string; awayName: string;
  homeLogo: string | null; awayLogo: string | null; dark: boolean;
}) {
  const { homeId, awayId, homeName, awayName, homeLogo, awayLogo, dark } = props;
  const k = `${homeId}-${awayId}`;
  const [info, setInfo] = useState<Info | null>(cache.get(k) ?? null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cache.has(k)) return;
    fetch(`/api/match-info?home=${homeId}&away=${awayId}`)
      .then(async r => {
        if (!r.ok) return setError('Údaje se nepodařilo načíst.');
        const data: Info = await r.json();
        cache.set(k, data);
        setInfo(data);
      })
      .catch(() => setError('Údaje se nepodařilo načíst.'));
  }, [k, homeId, awayId]);

  const sub = dark ? 'text-slate-400' : 'text-gray-500';
  const text = dark ? 'text-slate-200' : 'text-gray-800';
  if (error) return <p className="text-xs text-red-400 mt-2">{error}</p>;
  if (!info) return <p className={`text-xs mt-2 ${sub}`}>Načítám…</p>;

  const wins = { home: 0, away: 0, draw: 0 };
  for (const g of info.h2h) {
    if (g.home.goals == null || g.away.goals == null) continue;
    if (g.home.goals === g.away.goals) wins.draw++;
    else {
      const winnerId = g.home.goals > g.away.goals ? g.home.id : g.away.id;
      if (winnerId === homeId) wins.home++; else wins.away++;
    }
  }

  const team = (name: string, logo: string | null, rank: number | null, form: string | null) => (
    <div className="flex items-center gap-2 min-w-0">
      {logo && <img src={logo} alt="" className="h-4 w-4 object-contain shrink-0" />}
      <span className={`text-xs font-semibold truncate flex-1 ${text}`}>{name}{rank ? <span className={`font-normal ${sub}`}> · {rank}. místo</span> : null}</span>
      <FormChips form={form} />
    </div>
  );

  return (
    <div className={`mt-2 pt-2 border-t space-y-2 ${dark ? 'border-slate-700' : 'border-gray-200'}`}>
      <div className="space-y-1">
        <div className={`text-[10px] uppercase tracking-wider ${sub}`}>Forma (posledních 5 zápasů)</div>
        {team(homeName, homeLogo, info.home.rank, info.home.form)}
        {team(awayName, awayLogo, info.away.rank, info.away.form)}
      </div>
      {info.h2h.length > 0 && (
        <div className="space-y-1">
          <div className={`text-[10px] uppercase tracking-wider ${sub}`}>
            Vzájemné zápasy · {homeName} {wins.home} · remízy {wins.draw} · {awayName} {wins.away}
          </div>
          {info.h2h.map(g => (
            <div key={g.date} className={`flex items-center justify-between text-xs ${text}`}>
              <span className={`w-16 shrink-0 ${sub}`}>{new Date(g.date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: '2-digit' })}</span>
              <span className="flex-1 truncate">{g.home.name} <b>{g.home.goals}:{g.away.goals}</b> {g.away.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
