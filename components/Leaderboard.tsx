'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
type Ranked = Row & { rank: number };

const MEDALS = ['🥇', '🥈', '🥉'];
const BAR_COLORS = [
  'bg-yellow-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400',
  'bg-pink-400', 'bg-orange-400', 'bg-teal-400', 'bg-red-400',
];
const CHART_TOP = 20; // graf ukazuje nejlepších 20 + tebe (tisíce pruhů by byly nečitelné)

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Leaderboard({ currentUserId, dark }: { currentUserId: number; dark: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<'table' | 'chart'>('table');
  const [q, setQ] = useState('');
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

  // Pořadí: stejné body = stejné místo (1, 2, 2, 4 …), ne podle abecedy
  const ranked: Ranked[] = useMemo(() => {
    let prevRank = 0;
    return rows.map((r, i) => {
      const rank = i > 0 && Number(r.total_points) === Number(rows[i - 1].total_points) ? prevRank : i + 1;
      prevRank = rank;
      return { ...r, rank };
    });
  }, [rows]);

  const me = ranked.find(r => r.id === currentUserId) ?? null;
  const nq = norm(q.trim());
  const visible = nq ? ranked.filter(r => norm(r.nickname).includes(nq)) : ranked;
  const chartRows = ranked.filter((r, i) => i < CHART_TOP || r.id === currentUserId);
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
    chartTrack: dark ? 'bg-slate-700' : 'bg-gray-100',
    input: dark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
  };

  const rankLabel = (rank: number) => MEDALS[rank - 1] ?? rank;

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

      {/* TVOJE POZICE – vždy nahoře */}
      <div className={`rounded-xl border-2 mb-3 px-4 py-3 ${dark ? 'border-green-700 bg-green-900/30' : 'border-green-500 bg-green-50'}`}>
        {me ? (
          <button onClick={() => setSelectedPlayer({ id: me.id, nickname: me.nickname })} className="w-full text-left">
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold w-10 text-center ${d.sub}`}>{rankLabel(me.rank)}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold truncate ${dark ? 'text-green-200' : 'text-green-900'}`}>
                  {me.nickname} <span className="text-xs font-semibold text-green-500">(ty)</span>
                </div>
                <div className={`text-[11px] ${d.sub}`}>
                  z {ranked.length} hráčů · ⚽ {me.scorer_bonus} · 10b ×{me.exact} · 6b ×{me.six} · 4b ×{me.winner} · 2b ×{me.two} · 0b ×{me.zero}
                </div>
              </div>
              <span className={`text-xl font-bold ${d.points}`}>{me.total_points}<span className="text-xs ml-0.5">b</span></span>
            </div>
          </button>
        ) : (
          <p className={`text-sm text-center ${d.sub}`}>Zatím nemáš žádný tip. Natipuj první zápas a objevíš se v tabulce.</p>
        )}
      </div>

      {/* TABULKA */}
      {tab === 'table' && (
        <>
          {ranked.length >= 8 && (
            <input
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={`🔍 Hledat hráče (${ranked.length})…`}
              aria-label="Hledat hráče v tabulce"
              className={`w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-green-500 ${d.input}`}
            />
          )}
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
                {visible.map(row => (
                  <tr key={row.id} className={`border-t ${d.rowBorder} ${row.id === currentUserId ? d.rowMe : d.rowNormal}`}>
                    <td className={`py-2.5 px-3 font-bold ${d.sub}`}>{rankLabel(row.rank)}</td>
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
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={9} className={`py-8 text-center ${d.empty}`}>{nq ? 'Nikdo takový v tabulce není.' : 'Zatím žádní hráči'}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className={`px-3 py-2 border-t text-xs ${d.footer}`}>
              ⚽ střelec (+3b) · 10b přesný výsledek · 6b rozdíl nebo remíza · 4b správný vítěz · 2b počet gólů · 0b nic
            </div>
          </div>
        </>
      )}

      {/* GRAF */}
      {tab === 'chart' && (
        <div className={`rounded-xl border ${d.border} ${d.chartBg} p-4 space-y-3`}>
          {rows.length === 0 && (
            <p className={`text-center text-sm ${d.empty} py-8`}>Zatím žádná data</p>
          )}
          {ranked.length > CHART_TOP && (
            <p className={`text-xs text-center ${d.sub}`}>Graf ukazuje nejlepších {CHART_TOP} hráčů a tebe, celé pořadí je v tabulce.</p>
          )}
          {chartRows.map((row, i) => {
            const pct = maxPoints > 0 ? (Number(row.total_points) / maxPoints) * 100 : 0;
            const isMe = row.id === currentUserId;
            const barColor = BAR_COLORS[i % BAR_COLORS.length];
            return (
              <div key={row.id} className={`rounded-lg p-3 ${isMe ? (dark ? 'bg-green-900/30' : 'bg-green-50') : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${d.sub}`}>{rankLabel(row.rank)}</span>
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
