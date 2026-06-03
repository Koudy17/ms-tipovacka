'use client';

import { useState, useEffect } from 'react';

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  stage: string;
  goal_scorers: string | null;
}

interface Player {
  team: string;
  name: string;
  position: string;
}

const TEAM_NAME_MAP: Record<string, string> = {
  'JIŽNÍ AFRIKA': 'JIHOAFRICKÁ REPUBLIKA',
  'CAPE VERDE ISLANDS': 'KAPVERDY',
  'CONGO DR': 'DR KONGO',
};

function toPlayerKey(team: string) {
  const upper = team.toUpperCase();
  return TEAM_NAME_MAP[upper] ?? upper;
}

const MS_STAGES = ['GROUP_STAGE', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [inputs, setInputs] = useState<Record<number, [string, string]>>({});
  const [scorerInputs, setScorerInputs] = useState<Record<number, string[]>>({});
  const [savedMatches, setSavedMatches] = useState<Set<number>>(new Set());
  const [dirtyMatches, setDirtyMatches] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  const loadMatches = async () => {
    const [mRes, pRes] = await Promise.all([fetch('/api/matches'), fetch('/api/players')]);
    const data: Match[] = await mRes.json();
    const playerData: Player[] = await pRes.json();
    setMatches(data);
    setPlayers(playerData);
    const init: Record<number, [string, string]> = {};
    const scorerInit: Record<number, string[]> = {};
    for (const m of data) {
      init[m.id] = [m.home_score !== null ? String(m.home_score) : '', m.away_score !== null ? String(m.away_score) : ''];
      // Načti existující střelce jako pole
      const existing = m.goal_scorers ? m.goal_scorers.split(',').map(s => s.trim()).filter(Boolean) : [];
      scorerInit[m.id] = existing;
    }
    setInputs(init);
    setScorerInputs(scorerInit);
    setDirtyMatches(new Set());
  };

  const markDirty = (matchId: number) => {
    setDirtyMatches(prev => new Set(prev).add(matchId));
    setSavedMatches(prev => { const n = new Set(prev); n.delete(matchId); return n; });
  };

  const markSaved = (matchId: number) => {
    setSavedMatches(prev => new Set(prev).add(matchId));
    setDirtyMatches(prev => { const n = new Set(prev); n.delete(matchId); return n; });
    setTimeout(() => setSavedMatches(prev => { const n = new Set(prev); n.delete(matchId); return n; }), 3000);
  };

  useEffect(() => { if (authed) loadMatches(); }, [authed]);

  // Počet gólů = počet dropdownů/polí pro střelce
  const totalGoals = (matchId: number) => {
    const inp = inputs[matchId];
    if (!inp || inp[0] === '' || inp[1] === '') return 0;
    return Number(inp[0]) + Number(inp[1]);
  };

  const getScorerSlots = (matchId: number) => {
    const n = totalGoals(matchId);
    const current = scorerInputs[matchId] ?? [];
    // Doplň nebo ořízni pole na správnou délku
    const result = [...current];
    while (result.length < n) result.push('');
    return result.slice(0, n);
  };

  const updateScorer = (matchId: number, idx: number, val: string) => {
    const slots = getScorerSlots(matchId);
    slots[idx] = val;
    setScorerInputs({ ...scorerInputs, [matchId]: slots });
  };

  const getMatchPlayers = (m: Match): Player[] => {
    const homeKey = toPlayerKey(m.home_team);
    const awayKey = toPlayerKey(m.away_team);
    return players
      .filter(p => p.team === homeKey || p.team === awayKey)
      .sort((a, b) => {
        if (a.team !== b.team) return a.team === homeKey ? -1 : 1;
        const order: Record<string, number> = { Brankář: 0, Obránce: 1, Záložník: 2, Útočník: 3 };
        return (order[a.position] ?? 9) - (order[b.position] ?? 9);
      });
  };

  const saveLive = async (matchId: number) => {
    const inp = inputs[matchId];
    if (!inp || inp[0] === '' || inp[1] === '') return;
    const res = await fetch('/api/admin/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ matchId, homeScore: inp[0], awayScore: inp[1] }),
    });
    const data = await res.json();
    setMsg(data.ok ? `🔴 Průběžný výsledek uložen (body se nepočítají).` : `❌ ${data.error}`);
    if (data.ok) { markSaved(matchId); loadMatches(); }
  };

  const saveResult = async (matchId: number) => {
    const inp = inputs[matchId];
    if (!inp || inp[0] === '' || inp[1] === '') return;
    const scorers = (scorerInputs[matchId] ?? []).filter(Boolean);
    const res = await fetch('/api/admin/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ matchId, homeScore: inp[0], awayScore: inp[1], goalScorers: scorers }),
    });
    const data = await res.json();
    setMsg(data.ok ? `✅ Uloženo, přepočítáno ${data.updated} tipů.` : `❌ ${data.error}`);
    if (data.ok) { markSaved(matchId); loadMatches(); }
  };

  const syncResults = async () => {
    setSyncing(true);
    const res = await fetch('/api/sync-results', { headers: { 'x-admin-token': token } });
    const data = await res.json();
    setSyncing(false);
    setMsg(data.ok ? `✅ Synchronizováno: ${data.updatedMatches} zápasů.` : `❌ ${data.error}`);
    if (data.ok) loadMatches();
  };

  const addTestMatches = async () => {
    const res = await fetch('/api/admin/test-matches', { method: 'POST', headers: { 'x-admin-token': token } });
    const data = await res.json();
    setMsg(data.ok ? '✅ Test zápasy přidány.' : `❌ ${data.error}`);
    if (data.ok) loadMatches();
  };

  const deleteTestMatches = async () => {
    const res = await fetch('/api/admin/test-matches', { method: 'DELETE', headers: { 'x-admin-token': token } });
    const data = await res.json();
    setMsg(data.ok ? '✅ Test zápasy smazány.' : `❌ ${data.error}`);
    if (data.ok) loadMatches();
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-xl shadow w-80">
          <h1 className="text-xl font-bold mb-4 text-white">⚙️ Admin přístup</h1>
          <input type="password" className="w-full bg-slate-900 border border-slate-600 text-white rounded px-3 py-2 mb-3 focus:outline-none focus:border-green-500"
            placeholder="Admin heslo" value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setAuthed(true)} />
          <button onClick={() => setAuthed(true)} className="w-full bg-green-700 hover:bg-green-600 text-white rounded py-2 font-semibold">
            Přihlásit
          </button>
        </div>
      </div>
    );
  }

  const lockedMatches = matches.filter(m => new Date() >= new Date(m.kickoff));

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <h1 className="text-xl font-bold text-white">⚙️ Admin</h1>
          <div className="flex gap-2 flex-wrap">
            <button onClick={addTestMatches} className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">➕ Test</button>
            <button onClick={deleteTestMatches} className="bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">🗑️ Smazat test</button>
            <button onClick={syncResults} disabled={syncing} className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
              {syncing ? 'Sync…' : '🔄 Sync z API'}
            </button>
          </div>
        </div>

        {msg && <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 mb-4 text-sm text-white">{msg}</div>}

        <div className="space-y-3">
          {lockedMatches.map(m => {
            const isMS = MS_STAGES.includes(m.stage);
            const matchPlayers = isMS ? getMatchPlayers(m) : [];
            const hasPlayers = matchPlayers.length > 0;
            const goals = totalGoals(m.id);
            const slots = getScorerSlots(m.id);

            return (
              <div key={m.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                {/* Skóre */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex-1 font-semibold text-slate-100 text-right text-sm">{m.home_team}</span>
                  <input type="number" min="0"
                    value={inputs[m.id]?.[0] ?? ''}
                    onChange={e => { setInputs({ ...inputs, [m.id]: [e.target.value, inputs[m.id]?.[1] ?? ''] }); markDirty(m.id); }}
                    className="w-12 text-center bg-slate-900 border-2 border-slate-600 rounded-lg py-1 font-bold text-lg text-green-400 focus:border-green-500 focus:outline-none"
                  />
                  <span className="font-bold text-slate-500">:</span>
                  <input type="number" min="0"
                    value={inputs[m.id]?.[1] ?? ''}
                    onChange={e => { setInputs({ ...inputs, [m.id]: [inputs[m.id]?.[0] ?? '', e.target.value] }); markDirty(m.id); }}
                    className="w-12 text-center bg-slate-900 border-2 border-slate-600 rounded-lg py-1 font-bold text-lg text-green-400 focus:border-green-500 focus:outline-none"
                  />
                  <span className="flex-1 font-semibold text-slate-100 text-sm">{m.away_team}</span>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => saveResult(m.id)}
                      className={`text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        savedMatches.has(m.id)
                          ? 'bg-green-500'
                          : dirtyMatches.has(m.id)
                          ? 'bg-red-600 hover:bg-red-500'
                          : 'bg-green-700 hover:bg-green-600'
                      }`}>
                      {savedMatches.has(m.id) ? '✅ Uloženo!' : m.status === 'finished' ? '✅ Upravit' : '✅ Dokončeno'}
                    </button>
                    {m.status !== 'finished' && (
                      <button onClick={() => saveLive(m.id)}
                        className="bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
                        🔴 Živý
                      </button>
                    )}
                  </div>
                </div>

                {/* Střelci */}
                {goals > 0 && (
                  <div className="space-y-1.5 border-t border-slate-700 pt-2">
                    <p className="text-xs text-slate-400 mb-1">⚽ Střelci ({goals} gól{goals > 1 ? 'y' : ''}):</p>
                    {slots.map((val, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-4">{idx + 1}.</span>
                        {hasPlayers ? (
                          <>
                            <select
                              value={matchPlayers.some(p => p.name === val) ? val : ''}
                              onChange={e => updateScorer(m.id, idx, e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-yellow-300 focus:border-yellow-500 focus:outline-none"
                            >
                              <option value="">— vyber ze soupisky —</option>
                              <optgroup label={`${m.home_team}`}>
                                {matchPlayers.filter(p => p.team === toPlayerKey(m.home_team)).map(p => (
                                  <option key={p.name} value={p.name}>{p.name} ({p.position[0]})</option>
                                ))}
                              </optgroup>
                              <optgroup label={`${m.away_team}`}>
                                {matchPlayers.filter(p => p.team === toPlayerKey(m.away_team)).map(p => (
                                  <option key={p.name} value={p.name}>{p.name} ({p.position[0]})</option>
                                ))}
                              </optgroup>
                            </select>
                            <input type="text"
                              value={matchPlayers.some(p => p.name === val) ? '' : val}
                              onChange={e => updateScorer(m.id, idx, e.target.value)}
                              className="w-32 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-yellow-300 placeholder-slate-600 focus:border-yellow-500 focus:outline-none"
                              placeholder="nebo ručně…"
                            />
                          </>
                        ) : (
                          <input type="text" value={val}
                            onChange={e => updateScorer(m.id, idx, e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-yellow-300 placeholder-slate-600 focus:border-yellow-500 focus:outline-none"
                            placeholder="Jméno střelce…"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {goals === 0 && inputs[m.id]?.[0] !== '' && (
                  <p className="text-xs text-slate-500 border-t border-slate-700 pt-2">0:0 — žádní střelci</p>
                )}

                {m.status === 'finished' && (
                  <p className="text-xs text-green-500 mt-2">✅ Výsledek uložen</p>
                )}
              </div>
            );
          })}
          {lockedMatches.length === 0 && (
            <p className="text-slate-500 text-center py-8">Žádné uzamčené zápasy</p>
          )}
        </div>
      </div>
    </div>
  );
}
