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
  two: number;
  zero: number;
  scorer_bonus: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ currentUserId, dark }: { currentUserId: number; dark: boolean }) {
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

  const d = {
    title: dark ? 'text-slate-100' : 'text-gray-900',
    refresh: dark ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-800',
    border: dark ? 'border-slate-700' : 'border-gray-200',
    thead: dark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600',
    rowMe: dark ? 'bg-green-900/40 text-green-200' : 'bg-green-50 text-green-900',
    rowNormal: dark ? 'bg-slate-800 text-slate-200' : 'bg-white text-gray-800',
    rowBorder: dark ? 'border-slate-700' : 'border-gray-100',
    points: dark ? 'text-green-400' : 'text-green-700',
    sub: dark ? 'text-slate-400' : 'text-gray-500',
    footer: dark ? 'bg-slate-700/50 border-slate-700 text-slate-500' : 'bg-gray-50 border-gray-200 text-gray-400',
    empty: dark ? 'text-slate-500' : 'text-gray-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-base font-bold ${d.title}`}>🏆 Tabulka</h2>
        <button onClick={load} className={`text-xs ${d.refresh}`}>Obnovit</button>
      </div>

      <div className={`rounded-xl overflow-hidden border ${d.border}`}>
        <table className="w-full text-sm">
          <thead className={`${d.thead} text-xs uppercase`}>
            <tr>
              <th className="py-2 px-3 text-left">#</th>
              <th className="py-2 px-3 text-left">Hráč</th>
              <th className="py-2 px-3 text-center">Body</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">⚽</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">10b</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">6b</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">4b</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">2b</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">0b</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={`border-t ${d.rowBorder} ${row.id === currentUserId ? d.rowMe : d.rowNormal}`}>
                <td className={`py-2.5 px-3 font-bold ${d.sub}`}>{MEDALS[i] ?? i + 1}</td>
                <td className="py-2.5 px-3 font-semibold">
                  {row.nickname}
                  {row.id === currentUserId && <span className="ml-1 text-xs text-green-400">(ty)</span>}
                </td>
                <td className={`py-2.5 px-3 text-center font-bold ${d.points} text-base`}>{row.total_points}</td>
                <td className={`py-2.5 px-3 text-center ${d.sub} hidden sm:table-cell`}>{row.scorer_bonus}</td>
                <td className={`py-2.5 px-3 text-center ${d.sub} hidden sm:table-cell`}>{row.exact}</td>
                <td className={`py-2.5 px-3 text-center ${d.sub} hidden sm:table-cell`}>{row.six}</td>
                <td className={`py-2.5 px-3 text-center ${d.sub} hidden sm:table-cell`}>{row.winner}</td>
                <td className={`py-2.5 px-3 text-center ${d.sub} hidden sm:table-cell`}>{row.two}</td>
                <td className={`py-2.5 px-3 text-center ${d.sub} hidden sm:table-cell`}>{row.zero}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className={`py-8 text-center ${d.empty}`}>Zatím žádní hráči</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className={`px-3 py-2 border-t text-xs ${d.footer}`}>
          ⚽ střelec (+3b) · 10b přesný výsledek · 6b rozdíl/remíza · 4b vítěz · 2b počet gólů · 0b nic
        </div>
      </div>
    </div>
  );
}
