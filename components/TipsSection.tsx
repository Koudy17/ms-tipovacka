'use client';

import { useState, useEffect, useCallback } from 'react';
import { shortName } from '@/lib/teams';
import MatchInfo from '@/components/MatchInfo';
import LiveTimeline, { type LiveEvent } from '@/components/LiveTimeline';
import ScorerPicker from '@/components/ScorerPicker';

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  league_name: string | null;
  league_logo: string | null;
  home_logo: string | null;
  away_logo: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
}

interface Tip {
  match_id: number;
  home_tip: number;
  away_tip: number;
  scorer_tip: string | null;
  scorer_player_id: number | null;
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

interface LiveInfo {
  id: number;
  status: string;
  minute: number | null;
  extra: number | null;
  home: { goals: number | null };
  away: { goals: number | null };
  events: LiveEvent[];
}

// Záložky: "ODEHRANE" nebo den ve tvaru YYYY-MM-DD. Den končí v 6:00 pražského času,
// takže noční zápasy zůstanou u večera, ke kterému patří.
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague', year: 'numeric', month: '2-digit', day: '2-digit' });
function dayKey(iso: string) {
  return dayFmt.format(new Date(new Date(iso).getTime() - 6 * 3600 * 1000));
}

function tabLabel(tab: string) {
  if (tab === 'ODEHRANE') return '✅ Odehrané';
  const nowIso = new Date().toISOString();
  if (tab === dayKey(nowIso)) return '📅 Dnes';
  if (tab === dayKey(new Date(Date.now() + 24 * 3600 * 1000).toISOString())) return 'Zítra';
  return new Date(tab + 'T12:00:00Z').toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' });
}

// Zápas, který právě běží (začal před méně než 4 hodinami a není dohraný)
function isPlayingNow(m: { kickoff: string; status: string }) {
  return m.status !== 'finished' && isLocked(m.kickoff) && Date.now() - new Date(m.kickoff).getTime() < 4 * 3600 * 1000;
}

function CompetitionTag({ name, logo, dark }: { name: string | null; logo: string | null; dark: boolean }) {
  if (!name) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
      {logo && <img src={logo} alt="" className="h-3.5 w-3.5 object-contain" loading="lazy" />}
      {name}
    </span>
  );
}

function TeamName({ name, logo, align, wrap = false }: { name: string; logo: string | null; align: 'left' | 'right'; wrap?: boolean }) {
  const crest = logo ? <img src={logo} alt="" className="h-5 w-5 object-contain shrink-0" loading="lazy" /> : null;
  // wrap: na úzkém displeji se název zalomí (max. 2 řádky) místo useknutí
  const label = <span className={wrap ? `leading-tight break-words ${align === 'right' ? 'text-right' : 'text-left'}` : 'truncate'}>{shortName(name)}</span>;
  return (
    <span className={`flex-1 flex items-center gap-1.5 min-w-0 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      {align === 'right' && label}
      {crest}
      {align === 'left' && label}
    </span>
  );
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
  id: number;
  team_id: number;
  name: string;
  position: string | null;
}

const POSITION_ORDER: Record<string, number> = { 'Brankář': 0, 'Obránce': 1, 'Záložník': 2, 'Útočník': 3 };

// Tip na střelce (+3b): hráče vybírá uživatel ze soupisek, které plní sync z API-Football.
const SCORER_ENABLED = true;

interface MatchTip {
  nickname: string;
  user_id: number;
  home_tip: number;
  away_tip: number;
  scorer_tip: string | null;
  points: number | null;
  scorer_points: number | null;
}

const normName = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Tipy ostatních hráčů u zápasu: vlastní tip nahoře, hledání podle přezdívky, dlouhé seznamy po 50
function MatchTipsList({ tips, userId, dark }: { tips: MatchTip[]; userId: number; dark: boolean }) {
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(50);
  const sub = dark ? 'text-slate-500' : 'text-gray-400';
  if (tips.length === 0) return <p className={`text-xs text-center ${sub}`}>Nikdo netipoval</p>;

  const own = tips.filter(t => t.user_id === userId);
  const others = tips.filter(t => t.user_id !== userId);
  const nq = normName(q.trim());
  const filtered = [...own, ...others].filter(t => !nq || normName(t.nickname).includes(nq));
  const shown = filtered.slice(0, limit);

  return (
    <div className="space-y-1.5">
      {tips.length >= 8 && (
        <input
          type="search"
          value={q}
          onChange={e => { setQ(e.target.value); setLimit(50); }}
          placeholder={`🔍 Hledat hráče (${tips.length} tipů)…`}
          aria-label="Hledat hráče"
          className={`w-full border rounded-md px-2 py-1.5 text-xs mb-1 focus:outline-none focus:border-green-500 ${dark ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'}`}
        />
      )}
      {shown.length === 0 && <p className={`text-xs text-center ${sub}`}>Nikdo takový nenatipoval.</p>}
      {shown.map(mt => (
        <div
          key={mt.user_id}
          className={`grid text-xs gap-1 ${mt.user_id === userId ? (dark ? 'text-green-400' : 'text-green-700') : (dark ? 'text-slate-300' : 'text-gray-700')}`}
          style={{ gridTemplateColumns: '1fr 3rem 1fr 4.5rem' }}
        >
          <span className="font-semibold truncate">{mt.user_id === userId ? '👤 ' : ''}{mt.nickname}</span>
          <span className="font-bold text-center">{mt.home_tip}:{mt.away_tip}</span>
          <span className={`truncate ${dark ? 'text-yellow-500' : 'text-yellow-600'}`}>{mt.scorer_tip ? `⚽ ${mt.scorer_tip}` : ''}</span>
          <span className="text-right">{mt.points !== null ? pointsBadge(mt.points, mt.scorer_points) : ''}</span>
        </div>
      ))}
      {filtered.length > limit && (
        <button type="button" onClick={() => setLimit(l => l + 50)} className={`w-full text-xs py-1.5 rounded-md ${dark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Zobrazit dalších 50 (zbývá {filtered.length - limit})
        </button>
      )}
    </div>
  );
}

export default function TipsSection({ userId, dark = true, onSessionExpired }: { userId: number; dark?: boolean; onSessionExpired?: () => void }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tips, setTips] = useState<Map<number, Tip>>(new Map());
  const [inputs, setInputs] = useState<Map<number, [string, string]>>(new Map());
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [liveMap, setLiveMap] = useState<Map<number, LiveInfo>>(new Map()); // živá data z API (minuta, skóre, průběh)
  const [infoOpen, setInfoOpen] = useState<number | null>(null); // rozbalená forma / vzájemné zápasy
  const [matchTips, setMatchTips] = useState<Map<number, MatchTip[]>>(new Map());
  const [scorerInputs, setScorerInputs] = useState<Map<number, string>>(new Map());
  const [players, setPlayers] = useState<Player[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [savedAll, setSavedAll] = useState(false);
  const [errors, setErrors] = useState<Map<number, string>>(new Map());
  const [activeStage, setActiveStage] = useState<string>('');

  const load = useCallback(async () => {
    const [mRes, tRes, pRes] = await Promise.all([
      fetch('/api/matches'),
      fetch(`/api/tips?userId=${userId}`),
      SCORER_ENABLED ? fetch('/api/players') : Promise.resolve(null),
    ]);
    const matchData: Match[] = await mRes.json();
    if (tRes.status === 401) { onSessionExpired?.(); return; }
    const tipData: Tip[] = await tRes.json();
    if (pRes) setPlayers(await pRes.json());

    setMatches(matchData);

    // Výchozí záložka: dnešek, když tam jsou zápasy, jinak nejbližší den s nadcházejícím zápasem, jinak Odehrané
    setActiveStage(s => {
      if (s) return s;
      const today = dayKey(new Date().toISOString());
      if (matchData.some(m => dayKey(m.kickoff) === today)) return today;
      const next = matchData.filter(m => !isLocked(m.kickoff)).map(m => dayKey(m.kickoff)).sort()[0];
      return next ?? 'ODEHRANE';
    });

    const tMap = new Map<number, Tip>();
    const iMap = new Map<number, [string, string]>();
    const sMap = new Map<number, string>();
    for (const t of tipData) {
      tMap.set(t.match_id, t);
      iMap.set(t.match_id, [String(t.home_tip), String(t.away_tip)]);
      sMap.set(t.match_id, t.scorer_player_id != null ? String(t.scorer_player_id) : '');
    }
    setTips(tMap);
    setInputs(iMap);
    setScorerInputs(sMap);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Během zápasů průběžně načítat minutu, skóre a průběh (server to cachuje, takže počet návštěvníků nevadí)
  const hasLiveCandidate = matches.some(isPlayingNow);
  useEffect(() => {
    if (!hasLiveCandidate) return;
    let stop = false;
    let n = 0;
    const tick = async () => {
      if (document.hidden) return; // skrytá záložka / zamčený telefon: nic nestahovat
      try {
        const r = await fetch('/api/live');
        if (r.ok && !stop) {
          const data: { matches: LiveInfo[] } = await r.json();
          setLiveMap(new Map(data.matches.map(x => [x.id, x])));
        }
        // jednou za minutu obnovit i zápasy z DB (dohráno, body), ale bez zásahu do rozepsaných tipů
        if (!stop && n++ % 2 === 1) {
          const mr = await fetch('/api/matches');
          if (mr.ok) setMatches(await mr.json());
        }
      } catch {
        // výpadek spojení – zkusí se to za 30 s
      }
    };
    tick();
    const id = setInterval(tick, 30000);
    const onVisible = () => { if (!document.hidden) tick(); }; // po návratu do appky hned obnovit
    document.addEventListener('visibilitychange', onVisible);
    return () => { stop = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [hasLiveCandidate]);

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
        body: JSON.stringify({ userId, matchId: m.id, homeTip: inp[0], awayTip: inp[1], scorerPlayerId: scorerInputs.get(m.id) || null }),
      });
      if (res.status === 401) { onSessionExpired?.(); return; }
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

  const getMatchPlayers = (m: Match): Player[] =>
    players
      .filter(p => p.team_id === m.home_team_id || p.team_id === m.away_team_id)
      .sort((a, b) => (POSITION_ORDER[a.position ?? ''] ?? 9) - (POSITION_ORDER[b.position ?? ''] ?? 9) || a.name.localeCompare(b.name, 'cs'));

  const ODEHRANE = 'ODEHRANE';
  const isOdehrane = activeStage === ODEHRANE;

  // Dny, které mají co ukázat: ty s nedohraným zápasem a dnešek (kvůli čerstvým výsledkům)
  const today = dayKey(new Date().toISOString());
  const days = [...new Set(matches.filter(m => m.status !== 'finished' || dayKey(m.kickoff) === today).map(m => dayKey(m.kickoff)))].sort();
  const stages = [ODEHRANE, ...days];

  const dayMatches = isOdehrane ? [] : matches.filter(m => dayKey(m.kickoff) === activeStage);
  // živé zápasy jsou vidět nahoře na každé záložce, ať je nikdo nepřehlédne
  const playing = isOdehrane ? [] : matches.filter(isPlayingNow);
  const upcoming = dayMatches.filter(m => !isLocked(m.kickoff));
  const finished = isOdehrane
    ? matches.filter(m => m.status === 'finished').sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())
    : dayMatches.filter(m => m.status === 'finished');
  const filtered = [...playing, ...upcoming, ...finished];

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
    select: dark ? 'bg-slate-900 border-slate-600 text-yellow-300 focus:border-yellow-500 [&>option]:bg-slate-900' : 'bg-gray-50 border-gray-300 text-yellow-700 focus:border-yellow-500',
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
    <div className="space-y-4 pb-24">
      {/* Stage filtry */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {stages.map(s => (
          <button
            key={s}
            onClick={() => setActiveStage(s)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition ${d.stageBtn(activeStage === s)}`}
          >
            {tabLabel(s)}
          </button>
        ))}
      </div>

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
              const li = liveMap.get(m.id);
              const live = m.status === 'live' || !!li;
              const liveHome = li ? li.home.goals : m.home_score;
              const liveAway = li ? li.away.goals : m.away_score;
              const liveLabel = li ? (li.status === 'HT' ? 'přestávka' : li.minute ? `${li.minute}${li.extra ? `+${li.extra}` : ''}'` : 'LIVE') : 'LIVE';
              return (
                <div key={m.id} className={`rounded-xl px-3 py-2.5 border ${dark ? 'bg-slate-800 border-red-800' : 'bg-red-50 border-red-200'}`}>
                  <div className="mb-1.5"><CompetitionTag name={m.league_name} logo={m.league_logo} dark={dark} /></div>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 min-w-0 flex font-semibold ${d.teamLocked} text-sm`}><TeamName name={m.home_team} logo={m.home_logo} align="right" wrap /></div>
                    <div className="text-center shrink-0 min-w-[64px]">
                      {live && liveHome !== null ? (
                        <>
                          <div className={`text-xl font-bold leading-none ${d.score}`}>{liveHome}:{liveAway}</div>
                          <div className="mt-1 text-xs font-bold text-red-500 animate-pulse">{liveLabel}</div>
                        </>
                      ) : (
                        <span className={`${d.lockIcon} text-xs`}>🔒</span>
                      )}
                    </div>
                    <div className={`flex-1 min-w-0 flex font-semibold ${d.teamLocked} text-sm`}><TeamName name={m.away_team} logo={m.away_logo} align="left" wrap /></div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className={`text-xs min-w-0 ${d.tipText}`}>
                      {tip ? (
                        <>
                          Tvůj tip <span className="font-semibold">{tip.home_tip}:{tip.away_tip}</span>
                          
                          {tip.scorer_tip && <span className={`ml-1 ${d.scorerVal}`}>⚽ {tip.scorer_tip}</span>}
                        </>
                      ) : (
                        <span className={d.noTip}>Netipoval jsi</span>
                      )}
                    </div>
                    <button
                        onClick={() => toggleMatchTips(m.id)}
                        className={`text-[11px] px-2 py-1 rounded transition shrink-0 ${
                          expandedMatch === m.id
                            ? (dark ? 'bg-slate-600 text-white' : 'bg-gray-300 text-gray-800')
                            : (dark ? 'bg-slate-700 text-slate-300 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700')
                        }`}
                      >
                        {expandedMatch === m.id ? '▲ skrýt' : (li ? '▼ průběh' : '▼ tipy')}
                      </button>
                  </div>
                  {expandedMatch === m.id && (
                    <div className={`mt-2 pt-2 border-t ${dark ? 'border-slate-700' : 'border-gray-200'}`}>
                      {li && (
                        <div className={`mb-2 pb-2 border-b ${dark ? 'border-slate-700' : 'border-gray-200'}`}>
                          <LiveTimeline events={li.events} homeTeamId={m.home_team_id} dark={dark} />
                        </div>
                      )}
                      <MatchTipsList tips={matchTips.get(m.id) ?? []} userId={userId} dark={dark} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${d.time}`}>{formatKickoff(m.kickoff)}</span>
                      {m.home_team_id && m.away_team_id && (
                        <button
                          type="button"
                          onClick={() => setInfoOpen(infoOpen === m.id ? null : m.id)}
                          className={`text-[11px] px-1.5 py-0.5 rounded transition ${infoOpen === m.id ? (dark ? 'bg-slate-600 text-white' : 'bg-gray-300 text-gray-800') : (dark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700')}`}
                        >
                          📊 forma{infoOpen === m.id ? ' ▲' : ' ▼'}
                        </button>
                      )}
                    </div>
                    <CompetitionTag name={m.league_name} logo={m.league_logo} dark={dark} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 min-w-0 flex font-semibold ${d.team} text-sm leading-tight`}><TeamName name={m.home_team} logo={m.home_logo} align="right" wrap /></div>
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
                    <div className={`flex-1 min-w-0 flex font-semibold ${d.team} text-sm leading-tight`}><TeamName name={m.away_team} logo={m.away_logo} align="left" wrap /></div>
                  </div>
                  {SCORER_ENABLED && hasPlayers && (
                    <div className="mt-2">
                      <ScorerPicker
                        players={matchPlayers}
                        teams={[{ id: m.home_team_id, name: m.home_team }, { id: m.away_team_id, name: m.away_team }].filter((t): t is { id: number; name: string } => t.id != null)}
                        value={scorerInputs.get(m.id) ?? ''}
                        onChange={v => setScorerInputs(new Map(scorerInputs.set(m.id, v)))}
                        dark={dark}
                      />
                    </div>
                  )}
                  {infoOpen === m.id && m.home_team_id && m.away_team_id && (
                    <MatchInfo homeId={m.home_team_id} awayId={m.away_team_id} homeName={m.home_team} awayName={m.away_team} homeLogo={m.home_logo} awayLogo={m.away_logo} dark={dark} />
                  )}
                  {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
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
                  <div className="flex items-center justify-between mb-1.5">
                    <CompetitionTag name={m.league_name} logo={m.league_logo} dark={dark} />
                    <span className={`text-[10px] ${d.time}`}>{new Date(m.kickoff).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 min-w-0 flex font-semibold ${d.teamLocked} text-sm`}><TeamName name={m.home_team} logo={m.home_logo} align="right" wrap /></div>
                    <div className="text-center shrink-0 min-w-[56px]">
                      {m.home_score !== null ? (
                        <div className={`text-xl font-bold leading-none ${d.score}`}>{m.home_score}:{m.away_score}</div>
                      ) : (
                        <span className={`${d.lockIcon} text-xs`}>🔒</span>
                      )}
                    </div>
                    <div className={`flex-1 min-w-0 flex font-semibold ${d.teamLocked} text-sm`}><TeamName name={m.away_team} logo={m.away_logo} align="left" wrap /></div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className={`text-xs min-w-0 ${d.tipText}`}>
                      {tip ? (
                        <>
                          Tvůj tip <span className="font-semibold">{tip.home_tip}:{tip.away_tip}</span>
                          {tip.scorer_tip && <span className={`ml-1 ${d.scorerVal}`}>⚽ {tip.scorer_tip}</span>}
                        </>
                      ) : (
                        <span className={d.noTip}>Netipoval jsi</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tip ? pointsBadge(tip.points, tip.scorer_points) : null}
                      <button
                        onClick={() => toggleMatchTips(m.id)}
                        className={`text-[11px] px-2 py-1 rounded transition shrink-0 ${
                          expandedMatch === m.id
                            ? (dark ? 'bg-slate-600 text-white' : 'bg-gray-300 text-gray-800')
                            : (dark ? 'bg-slate-700 text-slate-300 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700')
                        }`}
                      >
                        {expandedMatch === m.id ? '▲ skrýt' : '▼ tipy'}
                      </button>
                    </div>
                  </div>

                  {/* Tipy ostatních */}
                  {expandedMatch === m.id && (
                    <div className={`mt-2 pt-2 border-t ${dark ? 'border-slate-700' : 'border-gray-200'}`}>
                      <MatchTipsList tips={matchTips.get(m.id) ?? []} userId={userId} dark={dark} />
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
