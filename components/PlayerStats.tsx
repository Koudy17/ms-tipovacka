'use client';

import { useState, useEffect } from 'react';

interface Tip {
  home_tip: number;
  away_tip: number;
  scorer_tip: string | null;
  points: number | null;
  scorer_points: number | null;
  home_team: string;
  away_team: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  match_id: number;
}

interface Stats {
  user: { id: number; nickname: string };
  tips: Tip[];
}

function formatKickoff(kickoff: string) {
  return new Date(kickoff).toLocaleString('cs-CZ', {
    day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function pointsBadge(points: number | null, scorerPoints: number | null) {
  if (points === null) return <span className="text-xs text-slate-500">—</span>;
  const total = points + (scorerPoints ?? 0);
  const colors: Record<number, string> = {
    10: 'bg-yellow-500 text-black', 6: 'bg-blue-500 text-white',
    4: 'bg-emerald-600 text-white', 2: 'bg-slate-500 text-white', 0: 'bg-red-900 text-red-300',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[points] ?? 'bg-slate-600 text-white'}`}>
      {total}b{scorerPoints ? ' ⚽' : ''}
    </span>
  );
}

interface Props {
  userId: number;
  nickname: string;
  dark: boolean;
  onClose: () => void;
}

export default function PlayerStats({ userId, nickname, dark, onClose }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch(`/api/stats?userId=${userId}`)
      .then(r => r.json())
      .then(setStats);
  }, [userId]);

  const finishedTips = stats?.tips.filter(t => t.status === 'finished') ?? [];
  const totalPoints = finishedTips.reduce((s, t) => s + (t.points ?? 0) + (t.scorer_points ?? 0), 0);
  const exact = finishedTips.filter(t => t.points === 10).length;
  const six = finishedTips.filter(t => t.points === 6).length;
  const four = finishedTips.filter(t => t.points === 4).length;
  const two = finishedTips.filter(t => t.points === 2).length;
  const zero = finishedTips.filter(t => t.points === 0).length;
  const scorerHits = finishedTips.filter(t => (t.scorer_points ?? 0) > 0).length;

  const d = {
    bg: dark ? 'bg-slate-900' : 'bg-white',
    header: dark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200',
    text: dark ? 'text-white' : 'text-gray-900',
    sub: dark ? 'text-slate-400' : 'text-gray-500',
    border: dark ? 'border-slate-700' : 'border-gray-200',
    row: dark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-100',
    team: dark ? 'text-slate-200' : 'text-gray-800',
    tip: dark ? 'text-slate-400' : 'text-gray-500',
    scorer: dark ? 'text-yellow-400' : 'text-yellow-600',
    stat: dark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200',
    statVal: dark ? 'text-green-400' : 'text-green-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className={`relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl ${d.bg} flex flex-col`} style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${d.header} rounded-t-2xl sm:rounded-t-2xl`}>
          <div>
            <h2 className={`font-bold text-lg ${d.text}`}>👤 {nickname}</h2>
            <p className={`text-xs ${d.sub}`}>{stats?.tips.length ?? '…'} tipů celkem</p>
          </div>
          <button onClick={onClose} className={`text-2xl leading-none ${d.sub} hover:text-red-400`}>×</button>
        </div>

        {/* Statistiky */}
        {stats && (
          <div className="px-4 py-3 grid grid-cols-4 gap-2">
            {[
              { label: 'Body', val: totalPoints, color: d.statVal },
              { label: '10b', val: exact, color: 'text-yellow-400' },
              { label: '6b', val: six, color: 'text-blue-400' },
              { label: '4b', val: four, color: 'text-emerald-400' },
              { label: '2b', val: two, color: 'text-slate-400' },
              { label: '0b', val: zero, color: 'text-red-400' },
              { label: '⚽ střelci', val: scorerHits, color: 'text-yellow-400' },
              { label: 'Tipů', val: finishedTips.length, color: d.sub },
            ].map(s => (
              <div key={s.label} className={`rounded-lg border p-2 text-center ${d.stat}`}>
                <div className={`text-lg font-bold ${s.color}`}>{s.val}</div>
                <div className={`text-[10px] ${d.sub}`}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Seznam tipů */}
        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {!stats && (
            <div className={`text-center py-8 ${d.sub}`}>Načítám…</div>
          )}
          <div className="space-y-1.5">
            {stats?.tips.map(t => (
              <div key={t.match_id} className={`rounded-lg border px-3 py-2 ${d.row}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold ${d.team} truncate`}>
                      {t.home_team} vs {t.away_team}
                    </div>
                    <div className={`text-[10px] ${d.sub}`}>{formatKickoff(t.kickoff)}</div>
                  </div>
                  <div className="w-[90px] shrink-0 text-center">
                    {t.status === 'finished' && t.home_score !== null ? (
                      <div className={`text-sm font-bold tabular-nums ${d.text}`}>{t.home_score} : {t.away_score}</div>
                    ) : (
                      <div className={`text-xs ${d.sub}`}>—</div>
                    )}
                    <div className={`text-xs ${d.tip}`}>
                      <span className="opacity-60">tip</span>{' '}
                      <span className="tabular-nums">{t.home_tip} : {t.away_tip}</span>
                      {t.scorer_tip && <span className={`ml-1 ${d.scorer}`}>⚽ {t.scorer_tip}</span>}
                    </div>
                  </div>
                  <div className="w-[52px] shrink-0 text-right">
                    {t.status === 'finished' ? pointsBadge(t.points, t.scorer_points) : (
                      <span className={`text-[10px] ${d.sub}`}>čeká</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
