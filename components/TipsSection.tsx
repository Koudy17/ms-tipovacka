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
    LAST_32: 'Šestnáctifinále',
    QUARTER_FINALS: 'Čtvrtfinále',
    SEMI_FINALS: 'Semifinále',
    THIRD_PLACE: 'O 3. místo',
    FINAL: 'Finále',
    TEST: '🧪 Test',
  };
  return labels[stage] ?? stage;
}

function groupLabel(group: string) {
  if (group === 'VSE') return 'Všechny';
  // GROUP_A → Skupina A, GROUP_B → Skupina B, …
  const match = group.match(/^GROUP_([A-Z]+)$/);
  if (match) return `Skupina ${match[1]}`;
  return group;
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

const SHORT_NAMES: Record<string, string> = {
  'Bosna a Hercegovina': 'Bosna a Herc.',
  'Severní Makedonie': 'S. Makedonie',
  'Dominikánská republika': 'Dominik. rep.',
  'Britské Panenské ostrovy': 'Brit. P. ostrovy',
  'Pobřeží slonoviny': 'Pobř. slonoviny',
  'Jihoafrická republika': 'J. Afrika',
  'Rovníková Guinea': 'Rovník. Guinea',
  'Středoafrická republika': 'SAR',
  'Trinidad a Tobago': 'Trinidad',
  'Antigua a Barbuda': 'Antigua',
  'Svatý Vincenc a Grenadiny': 'Sv. Vincenc',
  'Svatý Kryštof a Nevis': 'Sv. Kryštof',
};

function shortName(team: string): string {
  return SHORT_NAMES[team] ?? team;
}

// Mapování DB názvů → klíče v players.json (velkými písmeny)
const TEAM_NAME_MAP: Record<string, string> = {
  'JIŽNÍ AFRIKA': 'JIHOAFRICKÁ REPUBLIKA',
  'CAPE VERDE ISLANDS': 'KAPVERDY',
  'CONGO DR': 'DR KONGO',
  'DR KONGO': 'DR KONGO',
  'AUSTRIA': 'RAKOUSKO',
  'IRAQ': 'IRÁK',
  'JORDAN': 'JORDÁNSKO',
  'NORWAY': 'NORSKO',
  'SCOTLAND': 'SKOTSKO',
  'UZBEKISTAN': 'UZBEKISTÁN',
};

interface MatchTip {
  nickname: string;
  user_id: number;
  home_tip: number;
  away_tip: number;
  scorer_tip: string | null;
  points: number | null;
  scorer_points: number | null;
}

export default function TipsSection({ userId, dark = true }: { userId: number; dark?: boolean }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tips, setTips] = useState<Map<number, Tip>>(new Map());
  const [inputs, setInputs] = useState<Map<number, [string, string]>>(new Map());
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [matchTips, setMatchTips] = useState<Map<number, MatchTip[]>>(new Map());
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

  const toggleMatchTips = async (matchId: number) => {
    if (expandedMatch === matchId) {
      setExpandedMatch(null);
      return;
    }
    setExpandedMatch(matchId);
    if (!matchTips.has(matchId)) {
      const res = await fetch(`/api/match-tips?matchId=${matchId}`);
      const data: MatchTip[] = await res.json();
      setMatchTips(new Map(matchTips.set(matchId, data)));
    }
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
  const playing = filtered.filter(m => isLocked(m.kickoff) && m.status !== 'finished');
  const finished = filtered.filter(m => m.status === 'finished').sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime());

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
              {groupLabel(g)}
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
                    <span className={`flex-1 font-semibold ${d.team} text-right text-sm leading-tight`}>{shortName(m.home_team)}</span>
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
                          placeholder="–"
                        />
                      )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key="sep" className="text-slate-500 font-bold">:</span>, el], [] as React.ReactNode[])}
                    </div>
                    <span className={`flex-1 font-semibold ${d.team} text-sm leading-tight`}>{shortName(m.away_team)}</span>
                  </div>
                  {(() => {
                    const hasHome = matchPlayers.some(p => p.team === toPlayerKey(m.home_team));
                    const hasAway = matchPlayers.some(p => p.team === toPlayerKey(m.away_team));
                    const hasAny = hasHome || hasAway;
                    const currentVal = scorerInputs.get(m.id) ?? '';
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
                            {hasHome && hasAway && (
                              <option disabled value="">{'─'.repeat(40)}</option>
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

      {/* Hraje se */}
      {playing.length > 0 && (
        <section>
          <p className={`text-xs text-red-400 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1`}>
            <span className="animate-pulse">🔴</span> Hraje se
          </p>
          <div className="space-y-1.5">
            {playing.map(m => {
              const tip = tips.get(m.id);
              const finished = false;
              const live = m.status === 'live';
              return (
                <div key={m.id} className={`rounded-xl px-3 py-2.5 border ${dark ? 'bg-slate-800 border-red-800' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex-1 font-semibold ${d.teamLocked} text-right text-sm leading-tight`}>{m.home_team}</span>
                    <div className="text-center min-w-[72px]">
                      {live && m.home_score !== null ? (
                        <div>
                          <span className={`text-base font-bold ${d.score}`}>{m.home_score}:{m.away_score}</span>
                          <span className="ml-1 text-xs font-bold text-red-500 animate-pulse">LIVE</span>
                        </div>
                      ) : (
                        <span className={`${d.lockIcon} text-xs`}>🔒</span>
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
                    <div className="min-w-[52px] text-right flex flex-col items-end gap-1">
                      <button
                        onClick={() => toggleMatchTips(m.id)}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition ${
                          expandedMatch === m.id
                            ? (dark ? 'bg-slate-600 text-white' : 'bg-gray-300 text-gray-800')
                            : (dark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600')
                        }`}
                      >
                        {expandedMatch === m.id ? '▲ skrýt' : '▼ tipy'}
                      </button>
                    </div>
                  </div>
                  {expandedMatch === m.id && (
                    <div className={`mt-2 pt-2 border-t ${dark ? 'border-slate-700' : 'border-gray-200'}`}>
                      {(matchTips.get(m.id) ?? []).length === 0 ? (
                        <p className={`text-xs text-center ${d.empty}`}>Nikdo netipoval</p>
                      ) : (
                        <div className="space-y-1">
                          {(matchTips.get(m.id) ?? []).map(mt => (
                            <div key={mt.user_id} className={`flex items-center justify-between text-xs ${mt.user_id === userId ? (dark ? 'text-green-400' : 'text-green-700') : (dark ? 'text-slate-300' : 'text-gray-700')}`}>
                              <span className="font-semibold w-24 truncate">{mt.user_id === userId ? '👤 ' : ''}{mt.nickname}</span>
                              <span className="font-bold">{mt.home_tip}:{mt.away_tip}</span>
                              <span className={dark ? 'text-yellow-500' : 'text-yellow-600'}>{mt.scorer_tip ? `⚽ ${mt.scorer_tip}` : ''}</span>
                              <span className="min-w-[44px] text-right">{mt.points !== null ? pointsBadge(mt.points, mt.scorer_points) : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Odehrané */}
      {finished.length > 0 && (
        <section>
          <p className={`text-xs ${d.label} uppercase tracking-wider mb-2 font-semibold`}>Odehrané</p>
          <div className="space-y-1.5">
            {finished.map(m => {
              const tip = tips.get(m.id);
              const finished = true;
              const live = false;
              return (
                <div key={m.id} className={`rounded-xl px-3 py-2.5 border ${d.cardLocked(true)}`}>
                  <div className="flex items-start gap-1.5">
                    <span className={`flex-1 font-semibold ${d.teamLocked} text-right text-xs sm:text-sm pt-1 truncate`}>{m.home_team}</span>
                    <div className="text-center min-w-[76px] shrink-0">
                      {m.home_score !== null ? (
                        <>
                          <div className={`text-base font-bold ${d.score}`}>{m.home_score}:{m.away_score}</div>
                          {tip ? (
                            <div className={`text-[10px] sm:text-xs ${d.tipText}`}>
                              <span>tip: <span className="font-semibold">{tip.home_tip}:{tip.away_tip}</span></span>
                              {tip.scorer_tip && (
                                <span className={`ml-1 ${d.scorerVal}`}>⚽ {tip.scorer_tip.split(' ').slice(-1)}</span>
                              )}
                            </div>
                          ) : (
                            <div className={`text-[10px] ${d.noTip}`}>netipoval</div>
                          )}
                        </>
                      ) : (
                        <span className={`${d.lockIcon} text-xs`}>🔒</span>
                      )}
                    </div>
                    <span className={`flex-1 font-semibold ${d.teamLocked} text-xs sm:text-sm pt-1 truncate`}>{m.away_team}</span>
                    <div className="min-w-[52px] text-right flex flex-col items-end gap-1">
                      {tip ? pointsBadge(tip.points, tip.scorer_points) : null}
                      <button
                        onClick={() => toggleMatchTips(m.id)}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition ${
                          expandedMatch === m.id
                            ? (dark ? 'bg-slate-600 text-white' : 'bg-gray-300 text-gray-800')
                            : (dark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600')
                        }`}
                      >
                        {expandedMatch === m.id ? '▲ skrýt' : '▼ tipy'}
                      </button>
                    </div>
                  </div>

                  {/* Tipy ostatních */}
                  {expandedMatch === m.id && (
                    <div className={`mt-2 pt-2 border-t ${dark ? 'border-slate-700' : 'border-gray-200'}`}>
                      {(matchTips.get(m.id) ?? []).length === 0 ? (
                        <p className={`text-xs text-center ${d.empty}`}>Nikdo netipoval</p>
                      ) : (
                        <div className="space-y-1">
                          {(matchTips.get(m.id) ?? []).map(mt => (
                            <div key={mt.user_id} className={`grid text-xs gap-1 ${mt.user_id === userId ? (dark ? 'text-green-400' : 'text-green-700') : (dark ? 'text-slate-300' : 'text-gray-700')}`}
                              style={{ gridTemplateColumns: '1fr 3rem 1fr 4.5rem' }}>
                              <span className="font-semibold truncate">
                                {mt.user_id === userId ? '👤 ' : ''}{mt.nickname}
                              </span>
                              <span className="font-bold text-center">{mt.home_tip}:{mt.away_tip}</span>
                              <span className={`truncate ${dark ? 'text-yellow-500' : 'text-yellow-600'}`}>
                                {mt.scorer_tip ? `⚽ ${mt.scorer_tip}` : ''}
                              </span>
                              <span className="text-right">
                                {mt.points !== null ? pointsBadge(mt.points, mt.scorer_points) : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
        <div className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-3 border-t ${dark ? 'bg-slate-900 border-green-800' : 'bg-white border-green-300'}`}>
          <button
            onClick={saveAll}
            disabled={savingAll}
            className={`w-full max-w-2xl mx-auto block shadow text-sm font-bold px-5 py-3 rounded-xl transition disabled:opacity-50 ${
              savedAll
                ? 'bg-green-500 text-white'
                : 'bg-green-700 hover:bg-green-600 text-white'
            }`}
          >
            {savingAll ? '⏳ Ukládám…' : savedAll ? '✓ Uloženo!' : '💾 Uložit vše'}
          </button>
        </div>
      )}
    </div>
  );
}
