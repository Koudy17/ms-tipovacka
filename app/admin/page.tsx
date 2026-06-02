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
  goal_scorers: string | null;
}

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [inputs, setInputs] = useState<Record<number, [string, string]>>({});
  const [scorerInputs, setScorerInputs] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  const loadMatches = async () => {
    const res = await fetch('/api/matches');
    const data: Match[] = await res.json();
    setMatches(data);
    const init: Record<number, [string, string]> = {};
    const scorerInit: Record<number, string> = {};
    for (const m of data) {
      init[m.id] = [m.home_score !== null ? String(m.home_score) : '', m.away_score !== null ? String(m.away_score) : ''];
      scorerInit[m.id] = m.goal_scorers ?? '';
    }
    setInputs(init);
    setScorerInputs(scorerInit);
  };

  useEffect(() => { if (authed) loadMatches(); }, [authed]);

  const saveResult = async (matchId: number) => {
    const inp = inputs[matchId];
    if (!inp || inp[0] === '' || inp[1] === '') return;
    const res = await fetch('/api/admin/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ matchId, homeScore: inp[0], awayScore: inp[1], goalScorers: scorerInputs[matchId] ?? '' }),
    });
    const data = await res.json();
    setMsg(data.ok ? `✅ Zápas ${matchId} uložen, body přepočítány.` : `❌ ${data.error}`);
    if (data.ok) loadMatches();
  };

  const syncResults = async () => {
    setSyncing(true);
    const res = await fetch('/api/sync-results', { headers: { 'x-admin-token': token } });
    const data = await res.json();
    setSyncing(false);
    setMsg(data.ok ? `✅ Synchronizováno: ${data.updatedMatches} zápasů aktualizováno.` : `❌ ${data.error}`);
    if (data.ok) loadMatches();
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow w-80">
          <h1 className="text-xl font-bold mb-4">Admin přístup</h1>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 mb-3"
            placeholder="Admin heslo"
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setAuthed(true)}
          />
          <button onClick={() => setAuthed(true)} className="w-full bg-green-700 text-white rounded py-2 font-semibold">
            Přihlásit
          </button>
        </div>
      </div>
    );
  }

  const lockedMatches = matches.filter(m => new Date() >= new Date(m.kickoff));

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">⚙️ Admin – výsledky</h1>
          <button
            onClick={syncResults}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            {syncing ? 'Synchronizuji…' : '🔄 Sync z API'}
          </button>
        </div>

        {msg && <div className="bg-white border rounded-lg p-3 mb-4 text-sm">{msg}</div>}

        <div className="space-y-3">
          {lockedMatches.map(m => (
            <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-2">
                <span className="flex-1 font-semibold text-right">{m.home_team}</span>
                <input
                  type="number" min="0"
                  value={inputs[m.id]?.[0] ?? ''}
                  onChange={e => setInputs({ ...inputs, [m.id]: [e.target.value, inputs[m.id]?.[1] ?? ''] })}
                  className="w-12 text-center border-2 rounded-lg py-1 font-bold text-lg"
                />
                <span className="font-bold text-gray-400">:</span>
                <input
                  type="number" min="0"
                  value={inputs[m.id]?.[1] ?? ''}
                  onChange={e => setInputs({ ...inputs, [m.id]: [inputs[m.id]?.[0] ?? '', e.target.value] })}
                  className="w-12 text-center border-2 rounded-lg py-1 font-bold text-lg"
                />
                <span className="flex-1 font-semibold">{m.away_team}</span>
                <button
                  onClick={() => saveResult(m.id)}
                  className="bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold"
                >
                  {m.status === 'finished' ? 'Upravit' : 'Uložit'}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">⚽ Střelci (čárkou):</span>
                <input
                  type="text"
                  value={scorerInputs[m.id] ?? ''}
                  onChange={e => setScorerInputs({ ...scorerInputs, [m.id]: e.target.value })}
                  className="flex-1 border rounded px-2 py-1 text-xs"
                  placeholder="Mbappe, Ronaldo, …"
                />
              </div>
              {m.status === 'finished' && (
                <p className="text-xs text-green-600 mt-1 text-center">✅ Výsledek uložen</p>
              )}
            </div>
          ))}
          {lockedMatches.length === 0 && (
            <p className="text-gray-500 text-center py-8">Žádné uzamčené zápasy</p>
          )}
        </div>
      </div>
    </div>
  );
}
