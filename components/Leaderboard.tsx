'use client';

import { useState, useEffect, useCallback } from 'react';
import PlayerStats from '@/components/PlayerStats';

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
const BAR_COLORS = [
  'bg-yellow-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400',
  'bg-pink-400', 'bg-orange-400', 'bg-teal-400', 'bg-red-400',
];

export default function Leaderboard({ currentUserId, dark }: { currentUserId: number; dark: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<'table' | 'chart'>('table');
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: number; nickname: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/leaderboard');
    setRows(await res.json());
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const maxPoints = Math.max(...rows.map(r => Number(r.total_points)), 1);

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
    tabActive: dark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900 shadow',
    tabInactive: dark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700',
    chartBg: dark ? 'bg-slate-800' : 'bg-white',
    chartName: dark ? 'text-slate-200' : 'text-gray-800',
    chartPts: dark ? 'text-slate-400' : 'text-gray-500',
    chartTrack: dark ? 'bg-slate-700' : 'bg-gray-100',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-base font-bold ${d.title}`}>🏆 Tabulka</h2>
        <div className="flex items-center gap-3">
          {/* Přepínač zobrazení */}
          <div className={`flex rounded-lg p-0.5 text-xs font-semibold ${dark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <button onClick={() => setTab('table')} className={`px-3 py-1 rounded-md transition ${tab === 'table' ? d.tabActive : d.tabInactive}`}>
              📋 Tabulka
            </button>
            <button onClick={() => setTab('chart')} className={`px-3 py-1 rounded-md transition ${tab === 'chart' ? d.tabActive : d.tabInactive}`}>
              📊 Graf
            </button>
          </div>
          <button onClick={load} className={`text-xs ${d.refresh}`}>Obnovit</button>
        </div>
      </div>

      {/* TABULKA */}
      {tab === 'table' && (
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
                    <button
                      onClick={() => setSelectedPlayer({ id: row.id, nickname: row.nickname })}
                      className="hover:underline text-left"
                    >
                      {row.nickname}
                      {row.id === currentUserId && <span className="ml-1 text-xs text-green-400">(ty)</span>}
                    </button>
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
            ⚽ střelec (+3b) · 10b přesný výsledek · 6b rozdíl nebo remíza · 4b správný vítěz · 2b počet gólů · 0b nic
          </div>
        </div>
      )}

      {/* GRAF */}
      {tab === 'chart' && (
        <div className={`rounded-xl border ${d.border} ${d.chartBg} p-4 space-y-3`}>
          {rows.length === 0 && (
            <p className={`text-center text-sm ${d.empty} py-8`}>Zatím žádná data</p>
          )}
          {rows.map((row, i) => {
            const pct = maxPoints > 0 ? (Number(row.total_points) / maxPoints) * 100 : 0;
            const isMe = row.id === currentUserId;
            const barColor = BAR_COLORS[i % BAR_COLORS.length];
            return (
              <div key={row.id} className={`rounded-lg p-3 ${isMe ? (dark ? 'bg-green-900/30' : 'bg-green-50') : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${d.sub}`}>{MEDALS[i] ?? i + 1}</span>
                    <button
                      onClick={() => setSelectedPlayer({ id: row.id, nickname: row.nickname })}
                      className={`text-sm font-semibold ${d.chartName} hover:underline`}
                    >
                      {row.nickname}
                      {isMe && <span className="ml-1 text-xs text-green-400">(ty)</span>}
                    </button>
                  </div>
                  <span className={`text-sm font-bold ${d.points}`}>{row.total_points} b</span>
                </div>
                <div className={`w-full h-4 rounded-full ${d.chartTrack} overflow-hidden`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {row.scorer_bonus > 0 && (
                  <p className={`text-xs mt-0.5 ${d.chartPts}`}>⚽ z toho {row.scorer_bonus}b za střelce</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {selectedPlayer && (
        <PlayerStats
          userId={selectedPlayer.id}
          nickname={selectedPlayer.nickname}
          dark={dark}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
