'use client';

import { useEffect, useRef, useState } from 'react';

export interface PickerPlayer { id: number; team_id: number; name: string; position: string | null }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Výběr střelce s vyhledáváním (obyčejný <select> hledat neumí). Seznam je seskupený podle týmů,
// hledá se bez ohledu na diakritiku a velikost písmen.
export default function ScorerPicker({ players, teams, value, onChange, dark }: {
  players: PickerPlayer[];
  teams: { id: number; name: string }[];
  value: string;
  onChange: (id: string) => void;
  dark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = players.find(p => String(p.id) === value) ?? null;

  // zavřít klepnutím mimo nebo klávesou Esc
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const nq = norm(q.trim());
  const groups = teams
    .map(t => ({ ...t, list: players.filter(p => p.team_id === t.id && (!nq || norm(p.name).includes(nq))) }))
    .filter(g => g.list.length > 0);

  const c = {
    field: dark ? 'bg-slate-900 border-slate-600 text-yellow-300' : 'bg-gray-50 border-gray-300 text-yellow-700',
    panel: dark ? 'bg-slate-900 border-slate-600' : 'bg-white border-gray-300',
    input: dark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400',
    head: dark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500',
    item: dark ? 'text-slate-200 hover:bg-slate-700' : 'text-gray-800 hover:bg-gray-100',
    itemOn: dark ? 'bg-slate-700 text-yellow-300' : 'bg-yellow-50 text-yellow-700',
    muted: dark ? 'text-slate-500' : 'text-gray-400',
  };

  const pick = (id: string) => { onChange(id); setOpen(false); setQ(''); };

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`w-full border rounded-lg px-2 py-1.5 text-xs text-left flex items-center gap-2 focus:outline-none ${c.field}`}
      >
        {selected ? (
          <>
            <img src={`https://media.api-sports.io/football/players/${selected.id}.png`} alt="" className="h-6 w-6 rounded-full object-cover bg-slate-600 shrink-0" />
            <span className="flex-1 truncate font-semibold">⚽ {selected.name}</span>
          </>
        ) : (
          <span className="flex-1 truncate">⚽ Tip na střelce (+3b) — vyber ze soupisky</span>
        )}
        <span className="shrink-0 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={`mt-1 rounded-lg border overflow-hidden ${c.panel}`}>
          <div className="p-2">
            <input
              autoFocus
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="🔍 Hledat hráče…"
              aria-label="Hledat hráče"
              className={`w-full border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-yellow-500 ${c.input}`}
            />
          </div>
          <div className="max-h-64 overflow-y-auto overscroll-contain" role="listbox">
            {selected && (
              <button type="button" onClick={() => pick('')} className={`w-full text-left px-3 py-2 text-xs ${c.item} ${c.muted}`}>
                ✕ Bez tipu na střelce
              </button>
            )}
            {groups.length === 0 && <p className={`px-3 py-4 text-xs text-center ${c.muted}`}>Nikdo takový v soupisce není.</p>}
            {groups.map(g => (
              <div key={g.id}>
                <div className={`px-3 py-1 text-[10px] uppercase tracking-wider font-semibold sticky top-0 ${c.head}`}>{g.name}</div>
                {g.list.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={String(p.id) === value}
                    onClick={() => pick(String(p.id))}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left ${String(p.id) === value ? c.itemOn : c.item}`}
                  >
                    <img src={`https://media.api-sports.io/football/players/${p.id}.png`} alt="" loading="lazy" className="h-6 w-6 rounded-full object-cover bg-slate-600 shrink-0" />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className={`text-[10px] shrink-0 ${c.muted}`}>{p.position ?? ''}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
