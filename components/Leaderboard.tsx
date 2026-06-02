'use client';

import { useState, useEffect, useCallback } from 'react';

interface Row {
  id: number;
  nickname: string;
  total_points: number;
  scored_tips: number;
  exact: number;
  diff: number;
  winner: number;
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
        <h2 className="text-lg font-bold text-gray-800">🏆 Tabulka</h2>
        <button onClick={load} className="text-xs text-green-700 hover:underline">Obnovit</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-green-800 text-white text-xs uppercase">
            <tr>
              <th className="py-2 px-3 text-left">#</th>
              <th className="py-2 px-3 text-left">Hráč</th>
              <th className="py-2 px-3 text-center">Body</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">✨</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">~</th>
              <th className="py-2 px-3 text-center hidden sm:table-cell">✓</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-t border-gray-100 ${row.id === currentUserId ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <td className="py-2.5 px-3 font-bold text-gray-500">
                  {MEDALS[i] ?? i + 1}
                </td>
                <td className="py-2.5 px-3 font-semibold text-gray-800">
                  {row.nickname}
                  {row.id === currentUserId && <span className="ml-1 text-xs text-green-600">(ty)</span>}
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-green-800 text-base">{row.total_points}</td>
                <td className="py-2.5 px-3 text-center text-gray-600 hidden sm:table-cell">{row.exact}</td>
                <td className="py-2.5 px-3 text-center text-gray-600 hidden sm:table-cell">{row.diff}</td>
                <td className="py-2.5 px-3 text-center text-gray-600 hidden sm:table-cell">{row.winner}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">Zatím žádní hráči</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          ✨ přesný výsledek (5b) · ~ správný rozdíl (3b) · ✓ správný vítěz (1b)
        </div>
      </div>
    </div>
  );
}
