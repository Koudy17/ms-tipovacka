'use client';

import { useState, useEffect, useCallback } from 'react';

interface Row {
  id: number;
  nickname: string;
  total_points: number;
  scored_tips: number;
  exact: number;
  six: number;
  winner: number;
  scorer_bonus: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ currentUserId }: { currentUserId: number }) {
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/leaderboard');
    setRows(await res.json());
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-100">🏆 Tabulka</h2>
        <button onClick={load} className="text-xs text-green-400 hover:text-green-300">Obnovit</button>
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-slate-300 text-xs uppercase">
            <tr>
              <th className="py-2 px-3 text-left">#</th>
              <th className="py-2 px-3 text-left">Hráč</th>
              <th className="py-2 px-3 text-center">Body</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">⚽</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">10b</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">6b</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">4b</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-t border-slate-700 ${
                  row.id === currentUserId
                    ? 'bg-green-900/40 text-green-200'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                <td className="py-2.5 px-3 font-bold text-slate-400">
                  {MEDALS[i] ?? i + 1}
                </td>
                <td className="py-2.5 px-3 font-semibold">
                  {row.nickname}
                  {row.id === currentUserId && <span className="ml-1 text-xs text-green-400">(ty)</span>}
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-green-400 text-base">{row.total_points}</td>
                <td className="py-2.5 px-3 text-center text-slate-400 hidden sm:table-cell">{row.scorer_bonus}</td>
                <td className="py-2.5 px-3 text-center text-slate-400 hidden sm:table-cell">{row.exact}</td>
                <td className="py-2.5 px-3 text-center text-slate-400 hidden sm:table-cell">{row.six}</td>
                <td className="py-2.5 px-3 text-center text-slate-400 hidden sm:table-cell">{row.winner}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">Zatím žádní hráči</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-3 py-2 bg-slate-700/50 border-t border-slate-700 text-xs text-slate-500">
          ⚽ střelecké bonusy (+3b) · 10b přesný výsledek · 6b správný rozdíl/remíza · 4b správný vítěz
        </div>
      </div>
    </div>
  );
}
