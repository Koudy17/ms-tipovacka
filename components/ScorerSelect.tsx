'use client';

import { useState, useRef, useEffect } from 'react';

interface Player {
  team: string;
  name: string;
  position: string;
}

interface Props {
  homeTeam: string;
  awayTeam: string;
  homePlayers: Player[];
  awayPlayers: Player[];
  value: string;
  onChange: (val: string) => void;
  dark: boolean;
}

const POS_SHORT: Record<string, string> = {
  'Brankář': 'GK', 'Obránce': 'OB', 'Záložník': 'ZÁ', 'Útočník': 'ÚT',
};

export default function ScorerSelect({ homeTeam, awayTeam, homePlayers, awayPlayers, value, onChange, dark }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filterPlayers = (players: Player[]) =>
    search ? players.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : players;

  const filteredHome = filterPlayers(homePlayers);
  const filteredAway = filterPlayers(awayPlayers);
  const hasResults = filteredHome.length > 0 || filteredAway.length > 0;

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearch('');
  };

  const clear = () => {
    onChange('');
    setOpen(false);
    setSearch('');
  };

  const d = {
    trigger: dark
      ? 'bg-slate-900 border-slate-600 text-yellow-300 hover:border-yellow-500'
      : 'bg-gray-50 border-gray-300 text-yellow-700 hover:border-yellow-500',
    dropdown: dark
      ? 'bg-slate-800 border-slate-600 shadow-xl'
      : 'bg-white border-gray-200 shadow-xl',
    search: dark
      ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500 focus:border-green-500'
      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-green-500',
    teamHeader: dark
      ? 'bg-slate-700 text-slate-200'
      : 'bg-gray-100 text-gray-700',
    item: dark
      ? 'text-slate-200 hover:bg-slate-700'
      : 'text-gray-800 hover:bg-gray-100',
    pos: dark ? 'text-slate-500' : 'text-gray-400',
    empty: dark ? 'text-slate-500' : 'text-gray-400',
    clearBtn: dark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-700',
  };

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger tlačítko */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between border rounded-lg px-2 py-1.5 text-xs focus:outline-none transition ${d.trigger}`}
      >
        <span className={value ? '' : (dark ? 'text-slate-500' : 'text-gray-400')}>
          {value ? `⚽ ${value}` : '⚽ Tip na střelce (+3b) — vyber ze soupisky'}
        </span>
        <span className="ml-1 opacity-50">{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute z-50 w-full mt-1 border rounded-xl overflow-hidden ${d.dropdown}`} style={{ maxHeight: '280px', overflowY: 'auto' }}>
          {/* Vyhledávání */}
          <div className="p-2 sticky top-0 bg-inherit border-b border-opacity-20" style={{ borderColor: dark ? '#475569' : '#e5e7eb' }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full border rounded-lg px-2 py-1 text-xs focus:outline-none ${d.search}`}
              placeholder="Hledat hráče…"
            />
          </div>

          {/* Zrušit výběr */}
          {value && (
            <button onClick={clear} className={`w-full text-left px-3 py-1.5 text-xs ${d.clearBtn} border-b`} style={{ borderColor: dark ? '#475569' : '#e5e7eb' }}>
              ✕ Zrušit výběr
            </button>
          )}

          {!hasResults && (
            <div className={`px-3 py-4 text-xs text-center ${d.empty}`}>Žádný hráč nenalezen</div>
          )}

          {/* Domácí tým */}
          {filteredHome.length > 0 && (
            <div>
              <div className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${d.teamHeader}`}>
                🏠 {homeTeam}
              </div>
              {filteredHome.map(p => (
                <button
                  key={p.name}
                  onClick={() => select(p.name)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition ${d.item} ${value === p.name ? 'font-bold' : ''}`}
                >
                  <span>{value === p.name ? '✓ ' : ''}{p.name}</span>
                  <span className={`ml-2 ${d.pos}`}>{POS_SHORT[p.position] ?? p.position[0]}</span>
                </button>
              ))}
            </div>
          )}

          {/* Hosté */}
          {filteredAway.length > 0 && (
            <div>
              <div className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${d.teamHeader}`}>
                ✈️ {awayTeam}
              </div>
              {filteredAway.map(p => (
                <button
                  key={p.name}
                  onClick={() => select(p.name)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition ${d.item} ${value === p.name ? 'font-bold' : ''}`}
                >
                  <span>{value === p.name ? '✓ ' : ''}{p.name}</span>
                  <span className={`ml-2 ${d.pos}`}>{POS_SHORT[p.position] ?? p.position[0]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
