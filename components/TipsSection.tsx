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
  stage: string;
  matchday: number;
  group_name: string;
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

function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    GROUP_STAGE: 'Skupinová fáze',
    LAST_16: 'Osmifinále',
    QUARTER_FINALS: 'Čtvrtfinále',
    SEMI_FINALS: 'Semifinále',
    THIRD_PLACE: 'O 3. místo',
    FINAL: 'Finále',
  };
  return labels[stage] ?? stage;
}

function pointsBadge(points: number | null) {
  if (points === null) return null;
  const colors: Record<number, string> = {
    5: 'bg-yellow-500 text-black',
    3: 'bg-blue-500 text-white',
    1: 'bg-slate-500 text-white',
    0: 'bg-red-900 text-red-300',
  };
  const labels: Record<number, string> = { 5: '5b ✨', 3: '3b', 1: '1b', 0: '0b' };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[points] ?? 'bg-slate-600 text-white'}`}>
      {labels[points] ?? `${points}b`}
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
  const [activeStage, setActiveStage] = useState<string>('');
  const [activeGroup, setActiveGroup] = useState<string>('VSE');

  const load = useCallback(async () => {
    const [mRes, tRes] = await Promise.all([
      fetch('/api/matches'),
      fetch(`/api/tips?userId=${userId}`),
    ]);
    const matchData: Match[] = await mRes.json();
    const tipData: Tip[] = await tRes.json();

    setMatches(matchData);

    // Nastav výchozí stage na první nadcházející
    const firstUpcoming = matchData.find(m => !isLocked(m.kickoff));
    if (firstUpcoming) setActiveStage(s => s || firstUpcoming.stage);

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

  const stages = [...new Set(matches.map(m => m.stage))];
  const filteredByStage = activeStage ? matches.filter(m => m.stage === activeStage) : matches;

  const groups = activeStage === 'GROUP_STAGE'
    ? ['VSE', ...new Set(filteredByStage.map(m => m.group_name).filter(Boolean))]
    : [];

  const filtered = groups.length > 1 && activeGroup !== 'VSE'
    ? filteredByStage.filter(m => m.group_name === activeGroup)
    : filteredByStage;

  const upcoming = filtered.filter(m => !isLocked(m.kickoff));
  const locked = filtered.filter(m => isLocked(m.kickoff));

  return (
    <div className="space-y-4">
      {/* Stage filtry */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {stages.map(s => (
          <button
            key={s}
            onClick={() => { setActiveStage(s); setActiveGroup('VSE'); }}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              activeStage === s
                ? 'bg-green-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {stageLabel(s)}
          </button>
        ))}
      </div>

      {/* Skupinové filtry */}
      {groups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                activeGroup === g
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {g === 'VSE' ? 'Všechny' : g}
            </button>
          ))}
        </div>
      )}

      {/* Nadcházející */}
      {upcoming.length > 0 && (
        <section>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Tipuj</p>
          <div className="space-y-2">
            {upcoming.map(m => {
              const inp = inputs.get(m.id) ?? ['', ''];
              const err = errors.get(m.id);
              const hasTip = inp[0] !== '' && inp[1] !== '';
              return (
                <div key={m.id} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-2">{formatKickoff(m.kickoff)}</div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-semibold text-slate-100 text-right text-sm leading-tight">{m.home_team}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="0" max="99"
                        value={inp[0]}
                        onChange={e => setInput(m.id, 0, e.target.value)}
                        className="w-10 text-center bg-slate-900 border border-slate-600 rounded-lg py-1 text-base font-bold text-green-400 focus:border-green-500 focus:outline-none"
                        placeholder="?"
                      />
                      <span className="text-slate-500 font-bold">:</span>
                      <input
                        type="number" min="0" max="99"
                        value={inp[1]}
                        onChange={e => setInput(m.id, 1, e.target.value)}
                        className="w-10 text-center bg-slate-900 border border-slate-600 rounded-lg py-1 text-base font-bold text-green-400 focus:border-green-500 focus:outline-none"
                        placeholder="?"
                      />
                    </div>
                    <span className="flex-1 font-semibold text-slate-100 text-sm leading-tight">{m.away_team}</span>
                    <button
                      onClick={() => saveTip(m.id)}
                      disabled={saving === m.id}
                      className={`ml-1 text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                        saved.has(m.id)
                          ? 'bg-green-600 text-white'
                          : hasTip
                          ? 'bg-green-700 hover:bg-green-600 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {saving === m.id ? '…' : saved.has(m.id) ? '✓' : 'Uložit'}
                    </button>
                  </div>
                  {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Uzamčené */}
      {locked.length > 0 && (
        <section>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Uzamčené / odehrané</p>
          <div className="space-y-1.5">
            {locked.map(m => {
              const tip = tips.get(m.id);
              const finished = m.status === 'finished';
              return (
                <div key={m.id} className={`rounded-xl px-3 py-2.5 border ${finished ? 'bg-slate-800 border-slate-700' : 'bg-slate-800 border-orange-900'}`}>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-semibold text-slate-200 text-right text-sm leading-tight">{m.home_team}</span>
                    <div className="text-center min-w-[72px]">
                      {finished && m.home_score !== null ? (
                        <span className="text-base font-bold text-white">{m.home_score}:{m.away_score}</span>
                      ) : (
                        <span className="text-slate-500 text-xs">🔒 {formatKickoff(m.kickoff).split(' ').slice(-1)}</span>
                      )}
                      {tip ? (
                        <div className="text-xs text-slate-400">{tip.home_tip}:{tip.away_tip}</div>
                      ) : (
                        <div className="text-xs text-red-500">—</div>
                      )}
                    </div>
                    <span className="flex-1 font-semibold text-slate-200 text-sm leading-tight">{m.away_team}</span>
                    <div className="w-14 text-right">
                      {tip ? pointsBadge(tip.points) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <div className="text-center text-slate-500 py-12">Žádné zápasy</div>
      )}
    </div>
  );
}
