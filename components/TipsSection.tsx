'use client';

import { useState, useEffect, useCallback } from 'react';

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

interface Tip {
  match_id: number;
  home_tip: number;
  away_tip: number;
  points: number | null;
}

function isLocked(kickoff: string) {
  return new Date() >= new Date(kickoff);
}

function formatKickoff(kickoff: string) {
  return new Date(kickoff).toLocaleString('cs-CZ', {
    weekday: 'short', day: 'numeric', month: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function pointsBadge(points: number | null) {
  if (points === null) return null;
  const colors: Record<number, string> = {
    5: 'bg-yellow-400 text-yellow-900',
    3: 'bg-blue-400 text-white',
    1: 'bg-gray-300 text-gray-800',
    0: 'bg-red-100 text-red-700',
  };
  const labels: Record<number, string> = { 5: '5 b. ✨ Přesný!', 3: '3 b. Rozdíl!', 1: '1 b. Vítěz!', 0: '0 b.' };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[points] ?? 'bg-gray-200'}`}>
      {labels[points] ?? `${points} b.`}
    </span>
  );
}

export default function TipsSection({ userId }: { userId: number }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tips, setTips] = useState<Map<number, Tip>>(new Map());
  const [inputs, setInputs] = useState<Map<number, [string, string]>>(new Map());
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Map<number, string>>(new Map());

  const load = useCallback(async () => {
    const [mRes, tRes] = await Promise.all([
      fetch('/api/matches'),
      fetch(`/api/tips?userId=${userId}`),
    ]);
    const matchData: Match[] = await mRes.json();
    const tipData: Tip[] = await tRes.json();

    setMatches(matchData);
    const tMap = new Map<number, Tip>();
    const iMap = new Map<number, [string, string]>();
    for (const t of tipData) {
      tMap.set(t.match_id, t);
      iMap.set(t.match_id, [String(t.home_tip), String(t.away_tip)]);
    }
    setTips(tMap);
    setInputs(iMap);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const setInput = (matchId: number, idx: 0 | 1, val: string) => {
    const cur = inputs.get(matchId) ?? ['', ''];
    const next: [string, string] = [...cur] as [string, string];
    next[idx] = val.replace(/[^0-9]/g, '').slice(0, 2);
    setInputs(new Map(inputs.set(matchId, next)));
  };

  const saveTip = async (matchId: number) => {
    const inp = inputs.get(matchId);
    if (!inp || inp[0] === '' || inp[1] === '') {
      setErrors(new Map(errors.set(matchId, 'Vyplň obě čísla.')));
      return;
    }
    setSaving(matchId);
    setErrors(new Map(errors.set(matchId, '')));
    const res = await fetch('/api/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, matchId, homeTip: inp[0], awayTip: inp[1] }),
    });
    const data = await res.json();
    setSaving(null);
    if (data.error) {
      setErrors(new Map(errors.set(matchId, data.error)));
    } else {
      setSaved(new Set(saved.add(matchId)));
      setTimeout(() => setSaved(s => { const n = new Set(s); n.delete(matchId); return n; }), 2000);
      load();
    }
  };

  const upcoming = matches.filter(m => !isLocked(m.kickoff));
  const locked = matches.filter(m => isLocked(m.kickoff));

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Nadcházející zápasy</h2>
          <div className="space-y-3">
            {upcoming.map(m => {
              const inp = inputs.get(m.id) ?? ['', ''];
              const err = errors.get(m.id);
              return (
                <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{formatKickoff(m.kickoff)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-semibold text-gray-800 text-right">{m.home_team}</span>
                    <input
                      type="number" min="0" max="99"
                      value={inp[0]}
                      onChange={e => setInput(m.id, 0, e.target.value)}
                      className="w-12 text-center border-2 border-gray-200 rounded-lg py-1 text-lg font-bold text-green-800 focus:border-green-500 focus:outline-none"
                      placeholder="?"
                    />
                    <span className="text-gray-400 font-bold">:</span>
                    <input
                      type="number" min="0" max="99"
                      value={inp[1]}
                      onChange={e => setInput(m.id, 1, e.target.value)}
                      className="w-12 text-center border-2 border-gray-200 rounded-lg py-1 text-lg font-bold text-green-800 focus:border-green-500 focus:outline-none"
                      placeholder="?"
                    />
                    <span className="flex-1 font-semibold text-gray-800">{m.away_team}</span>
                    <button
                      onClick={() => saveTip(m.id)}
                      disabled={saving === m.id}
                      className="ml-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                      {saving === m.id ? '...' : saved.has(m.id) ? '✓' : 'Uložit'}
                    </button>
                  </div>
                  {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Uzamčené / odehrané</h2>
          <div className="space-y-3">
            {locked.map(m => {
              const tip = tips.get(m.id);
              const finished = m.status === 'finished';
              return (
                <div key={m.id} className={`bg-white rounded-xl shadow-sm border p-4 ${finished ? 'border-gray-200' : 'border-yellow-200 bg-yellow-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{formatKickoff(m.kickoff)}</span>
                    <span className="text-xs font-medium text-orange-500">🔒 Uzamčeno</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex-1 font-semibold text-gray-800 text-right text-sm">{m.home_team}</span>
                    <div className="text-center min-w-[80px]">
                      {finished && m.home_score !== null ? (
                        <span className="text-lg font-bold text-gray-900">{m.home_score} : {m.away_score}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">vs</span>
                      )}
                      {tip ? (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Tip: <span className="font-semibold">{tip.home_tip}:{tip.away_tip}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-red-400 mt-0.5">Netipoval jsi</div>
                      )}
                    </div>
                    <span className="flex-1 font-semibold text-gray-800 text-sm">{m.away_team}</span>
                    <div className="ml-2 w-24 text-right">
                      {tip && pointsBadge(tip.points)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {matches.length === 0 && (
        <div className="text-center text-gray-400 py-12">Načítání zápasů…</div>
      )}
    </div>
  );
}
