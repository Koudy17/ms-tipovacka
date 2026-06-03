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
  scorer_tip: string | null;
  points: number | null;
  scorer_points: number | null;
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
    TEST: '🧪 Test',
  };
  return labels[stage] ?? stage;
}

function pointsBadge(points: number | null, scorerPoints: number | null) {
  if (points === null) return null;
  const total = points + (scorerPoints ?? 0);
  const colors: Record<number, string> = {
    10: 'bg-yellow-400 text-black',
    6: 'bg-blue-500 text-white',
    4: 'bg-emerald-600 text-white',
    2: 'bg-slate-500 text-white',
    0: 'bg-red-900 text-red-300',
  };
  const labels: Record<number, string> = { 10: '10b ✨', 6: '6b', 4: '4b', 2: '2b', 0: '0b' };
  const baseColor = colors[points] ?? 'bg-slate-600 text-white';
  const baseLabel = labels[points] ?? `${points}b`;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${baseColor}`}>
      {scorerPoints ? `${total}b` : baseLabel}
      {scorerPoints ? <span className="ml-1 opacity-75">⚽</span> : null}
    </span>
  );
}

interface Player {
  team: string;
  name: string;
  position: string;
}

const POSITION_ORDER: Record<string, number> = { 'Brankář': 0, 'Obránce': 1, 'Záložník': 2, 'Útočník': 3 };

// Mapování DB názvů → klíče v players.json (velkými písmeny)
const TEAM_NAME_MAP: Record<string, string> = {
  'JIŽNÍ AFRIKA': 'JIHOAFRICKÁ REPUBLIKA',
  'CAPE VERDE ISLANDS': 'KAPVERDY',
  'CONGO DR': 'DR KONGO',
};

export default function TipsSection({ userId }: { userId: number }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tips, setTips] = useState<Map<number, Tip>>(new Map());
  const [inputs, setInputs] = useState<Map<number, [string, string]>>(new Map());
  const [scorerInputs, setScorerInputs] = useState<Map<number, string>>(new Map());
  const [players, setPlayers] = useState<Player[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [savedAll, setSavedAll] = useState(false);
  const [errors, setErrors] = useState<Map<number, string>>(new Map());
  const [activeStage, setActiveStage] = useState<string>('');
  const [activeGroup, setActiveGroup] = useState<string>('VSE');

  const load = useCallback(async () => {
    const [mRes, tRes, pRes] = await Promise.all([
      fetch('/api/matches'),
      fetch(`/api/tips?userId=${userId}`),
      fetch('/api/players'),
    ]);
    const matchData: Match[] = await mRes.json();
    const tipData: Tip[] = await tRes.json();
    const playerData: Player[] = await pRes.json();
    setPlayers(playerData);

    setMatches(matchData);

    // Nastav výchozí stage na první nadcházející
    const firstUpcoming = matchData.find(m => !isLocked(m.kickoff));
    if (firstUpcoming) setActiveStage(s => s || firstUpcoming.stage);

    const tMap = new Map<number, Tip>();
    const iMap = new Map<number, [string, string]>();
    const sMap = new Map<number, string>();
    for (const t of tipData) {
      tMap.set(t.match_id, t);
      iMap.set(t.match_id, [String(t.home_tip), String(t.away_tip)]);
      sMap.set(t.match_id, t.scorer_tip ?? '');
    }
    setTips(tMap);
    setInputs(iMap);
    setScorerInputs(sMap);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const setInput = (matchId: number, idx: 0 | 1, val: string) => {
    const cur = inputs.get(matchId) ?? ['', ''];
    const next: [string, string] = [...cur] as [string, string];
    next[idx] = val.replace(/[^0-9]/g, '').slice(0, 2);
    setInputs(new Map(inputs.set(matchId, next)));
  };

  const saveAll = async () => {
    const upcoming = matches.filter(m => !isLocked(m.kickoff));
    const toSave = upcoming.filter(m => {
      const inp = inputs.get(m.id);
      return inp && inp[0] !== '' && inp[1] !== '';
    });
    if (toSave.length === 0) return;

    setSavingAll(true);
    const newErrors = new Map(errors);
    for (const m of toSave) {
      const inp = inputs.get(m.id)!;
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, matchId: m.id, homeTip: inp[0], awayTip: inp[1], scorerTip: scorerInputs.get(m.id) ?? '' }),
      });
      const data = await res.json();
      if (data.error) newErrors.set(m.id, data.error);
      else newErrors.delete(m.id);
    }
    setErrors(newErrors);
    setSavingAll(false);
    setSavedAll(true);
    setTimeout(() => setSavedAll(false), 2000);
    load();
  };

  const toPlayerKey = (team: string) => {
    const upper = team.toUpperCase();
    return TEAM_NAME_MAP[upper] ?? upper;
  };

  const getMatchPlayers = (m: Match): Player[] => {
    const homeKey = toPlayerKey(m.home_team);
    const awayKey = toPlayerKey(m.away_team);
    return players
      .filter(p => p.team === homeKey || p.team === awayKey)
      .sort((a, b) => {
        if (a.team !== b.team) return a.team === homeKey ? -1 : 1;
        return (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9);
      });
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
                  </div>
                  {(() => {
                    const matchPlayers = getMatchPlayers(m);
                    if (matchPlayers.length === 0) return null;
                    return (
                      <div className="mt-2">
                        <select
                          value={scorerInputs.get(m.id) ?? ''}
                          onChange={e => setScorerInputs(new Map(scorerInputs.set(m.id, e.target.value)))}
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-yellow-300 focus:border-yellow-500 focus:outline-none"
                        >
                          <option value="">⚽ Tip na střelce (+3b) — nepovinné</option>
                          <optgroup label={`— ${m.home_team} —`}>
                            {matchPlayers.filter(p => p.team === toPlayerKey(m.home_team)).map(p => (
                              <option key={p.name} value={p.name}>{p.name} ({p.position[0]})</option>
                            ))}
                          </optgroup>
                          <optgroup label={`— ${m.away_team} —`}>
                            {matchPlayers.filter(p => p.team === toPlayerKey(m.away_team)).map(p => (
                              <option key={p.name} value={p.name}>{p.name} ({p.position[0]})</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    );
                  })()}
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
                        <div className="text-xs text-slate-400">
                          {tip.home_tip}:{tip.away_tip}
                          {tip.scorer_tip && <span className="ml-1 text-yellow-500">⚽{tip.scorer_tip}</span>}
                        </div>
                      ) : (
                        <div className="text-xs text-red-500">—</div>
                      )}
                    </div>
                    <span className="flex-1 font-semibold text-slate-200 text-sm leading-tight">{m.away_team}</span>
                    <div className="w-14 text-right">
                      {tip ? pointsBadge(tip.points, tip.scorer_points) : null}
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

      {upcoming.length > 0 && (
        <div className="fixed bottom-6 right-4 z-50">
          <button
            onClick={saveAll}
            disabled={savingAll}
            className={`shadow-lg text-sm font-bold px-5 py-3 rounded-full transition disabled:opacity-50 ${
              savedAll
                ? 'bg-green-500 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {savingAll ? '⏳ Ukládám…' : savedAll ? '✓ Uloženo!' : '💾 Uložit vše'}
          </button>
        </div>
      )}
    </div>
  );
}
