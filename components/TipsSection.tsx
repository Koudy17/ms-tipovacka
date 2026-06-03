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

export default function TipsSection({ userId, dark = true }: { userId: number; dark?: boolean }) {
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

  const d = {
    label: dark ? 'text-slate-400' : 'text-gray-500',
    stageBtn: (active: boolean) => active
      ? 'bg-green-500 text-white'
      : dark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300',
    groupBtn: (active: boolean) => active
      ? 'bg-emerald-600 text-white'
      : dark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300',
    card: dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    cardLocked: (finished: boolean) => finished
      ? (dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200')
      : (dark ? 'bg-slate-800 border-orange-900' : 'bg-orange-50 border-orange-200'),
    time: dark ? 'text-slate-400' : 'text-gray-400',
    team: dark ? 'text-slate-100' : 'text-gray-900',
    teamLocked: dark ? 'text-slate-200' : 'text-gray-700',
    score: dark ? 'text-white' : 'text-gray-900',
    tipText: dark ? 'text-slate-400' : 'text-gray-500',
    noTip: 'text-red-500',
    input: dark ? 'bg-slate-900 border-slate-600 text-green-400 focus:border-green-500' : 'bg-gray-50 border-gray-300 text-green-700 focus:border-green-500',
    select: dark ? 'bg-slate-900 border-slate-600 text-yellow-300 focus:border-yellow-500' : 'bg-gray-50 border-gray-300 text-yellow-700 focus:border-yellow-500',
    manualInput: dark ? 'bg-slate-900 border-slate-600 text-yellow-300 placeholder-slate-600 focus:border-yellow-500' : 'bg-gray-50 border-gray-300 text-yellow-700 placeholder-gray-400 focus:border-yellow-500',
    saveBtn: (hasTip: boolean, isSaved: boolean) => isSaved
      ? 'bg-green-600 text-white'
      : hasTip ? 'bg-green-700 hover:bg-green-600 text-white' : (dark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-400'),
    savAllBtn: (savedAll: boolean) => savedAll
      ? 'bg-green-500 text-white shadow-lg'
      : 'bg-green-700 hover:bg-green-600 text-white shadow-lg',
    lockIcon: dark ? 'text-slate-500' : 'text-gray-400',
    scorerLabel: dark ? 'text-slate-500' : 'text-gray-400',
    scorerVal: dark ? 'text-yellow-500' : 'text-yellow-600',
    empty: dark ? 'text-slate-500' : 'text-gray-400',
  };

  return (
    <div className="space-y-4">
      {/* Stage filtry */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {stages.map(s => (
          <button
            key={s}
            onClick={() => { setActiveStage(s); setActiveGroup('VSE'); }}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition ${d.stageBtn(activeStage === s)}`}
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
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition ${d.groupBtn(activeGroup === g)}`}
            >
              {g === 'VSE' ? 'Všechny' : g}
            </button>
          ))}
        </div>
      )}

      {/* Nadcházející */}
      {upcoming.length > 0 && (
        <section>
          <p className={`text-xs ${d.label} uppercase tracking-wider mb-2 font-semibold`}>Tipuj</p>
          <div className="space-y-2">
            {upcoming.map(m => {
              const inp = inputs.get(m.id) ?? ['', ''];
              const err = errors.get(m.id);
              const savedTip = tips.get(m.id);
              const hasSavedTip = !!savedTip;
              const matchPlayers = getMatchPlayers(m);
              const hasPlayers = matchPlayers.length > 0;
              const missingScorer = hasSavedTip && hasPlayers && !savedTip?.scorer_tip;
              const borderClass = !hasSavedTip ? 'border-red-700' : missingScorer ? 'border-orange-500' : (dark ? 'border-slate-700' : 'border-gray-200');
              return (
                <div key={m.id} className={`${dark ? 'bg-slate-800' : 'bg-white'} rounded-xl p-3 border ${borderClass}`}>
                  <div className={`text-xs ${d.time} mb-2`}>{formatKickoff(m.kickoff)}</div>
                  <div className="flex items-center gap-2">
                    <span className={`flex-1 font-semibold ${d.team} text-right text-sm leading-tight`}>{m.home_team}</span>
                    <div className="flex items-center gap-1">
                      {([0, 1] as const).map(idx => (
                        <input
                          key={idx}
                          type="number" min="0" max="99"
                          value={inp[idx]}
                          onChange={e => {
                            const val = e.target.value;
                            // Pokud prohlížeč vrátí prázdný string (šipka dolů na 0), vymaž pole
                            if (val === '' || Number(val) < 0) {
                              setInput(m.id, idx, '');
                            } else {
                              setInput(m.id, idx, val);
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === 'ArrowDown' && inp[idx] === '0') {
                              e.preventDefault();
                              setInput(m.id, idx, '');
                            }
                          }}
                          className={`w-10 text-center border rounded-lg py-1 text-base font-bold focus:outline-none ${d.input}`}
                          placeholder="?"
                        />
                      )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key="sep" className="text-slate-500 font-bold">:</span>, el], [] as React.ReactNode[])}
                    </div>
                    <span className={`flex-1 font-semibold ${d.team} text-sm leading-tight`}>{m.away_team}</span>
                  </div>
                  {(() => {
                    const hasHome = matchPlayers.some(p => p.team === toPlayerKey(m.home_team));
                    const hasAway = matchPlayers.some(p => p.team === toPlayerKey(m.away_team));
                    const hasAny = hasHome || hasAway;
                    const currentVal = scorerInputs.get(m.id) ?? '';
                    // Je vybraná hodnota z dropdownu nebo ručně napsaná?
                    const isFromDropdown = hasAny && matchPlayers.some(p => p.name === currentVal);
                    const manualVal = isFromDropdown ? '' : currentVal;
                    return (
                      <div className="mt-2 space-y-1.5">
                        {hasAny && (
                          <select
                            value={isFromDropdown ? currentVal : ''}
                            onChange={e => setScorerInputs(new Map(scorerInputs.set(m.id, e.target.value)))}
                            className={`w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none ${d.select}`}
                          >
                            <option value="">⚽ Tip na střelce (+3b) — vyber ze soupisky</option>
                            {hasHome && (
                              <optgroup label={`— ${m.home_team} —`}>
                                {matchPlayers.filter(p => p.team === toPlayerKey(m.home_team)).map(p => (
                                  <option key={p.name} value={p.name}>{p.name} ({p.position[0]})</option>
                                ))}
                              </optgroup>
                            )}
                            {hasAway && (
                              <optgroup label={`— ${m.away_team} —`}>
                                {matchPlayers.filter(p => p.team === toPlayerKey(m.away_team)).map(p => (
                                  <option key={p.name} value={p.name}>{p.name} ({p.position[0]})</option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        )}
                        {(!hasHome || !hasAway) && (
                          <input
                            type="text"
                            value={manualVal}
                            onChange={e => setScorerInputs(new Map(scorerInputs.set(m.id, e.target.value)))}
                            className={`w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none ${d.manualInput}`}
                            placeholder={hasAny ? 'nebo napiš ručně (hráč bez soupisky)…' : '⚽ Tip na střelce (+3b) — napiš jméno…'}
                            maxLength={60}
                          />
                        )}
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
          <p className={`text-xs ${d.label} uppercase tracking-wider mb-2 font-semibold`}>Uzamčené / odehrané</p>
          <div className="space-y-1.5">
            {locked.map(m => {
              const tip = tips.get(m.id);
              const finished = m.status === 'finished';
              return (
                <div key={m.id} className={`rounded-xl px-3 py-2.5 border ${d.cardLocked(finished)}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex-1 font-semibold ${d.teamLocked} text-right text-sm leading-tight`}>{m.home_team}</span>
                    <div className="text-center min-w-[72px]">
                      {finished && m.home_score !== null ? (
                        <span className={`text-base font-bold ${d.score}`}>{m.home_score}:{m.away_score}</span>
                      ) : (
                        <span className={`${d.lockIcon} text-xs`}>🔒 {formatKickoff(m.kickoff).split(' ').slice(-1)}</span>
                      )}
                      {tip ? (
                        <div className={`text-xs ${d.tipText}`}>
                          {tip.home_tip}:{tip.away_tip}
                          {tip.scorer_tip && <span className={`ml-1 ${d.scorerVal}`}>⚽{tip.scorer_tip}</span>}
                        </div>
                      ) : (
                        <div className={`text-xs ${d.noTip}`}>—</div>
                      )}
                    </div>
                    <span className={`flex-1 font-semibold ${d.teamLocked} text-sm leading-tight`}>{m.away_team}</span>
                    <div className="min-w-[52px] text-right">
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
        <div className={`text-center ${d.empty} py-12`}>Žádné zápasy</div>
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
