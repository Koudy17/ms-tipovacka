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

// Jednoduchá mapa vlajek pro nejčastější týmy
const FLAGS: Record<string, string> = {
  'ČESKO': '🇨🇿', 'MEXIKO': '🇲🇽', 'JIŽNÍ KOREA': '🇰🇷', 'JIHOAFRICKÁ REPUBLIKA': '🇿🇦',
  'KANADA': '🇨🇦', 'KATAR': '🇶🇦', 'ŠVÝCARSKO': '🇨🇭', 'BOSNA A HERCEGOVINA': '🇧🇦',
  'BRAZÍLIE': '🇧🇷', 'MAROKO': '🇲🇦', 'HAITI': '🇭🇹', 'SKOTSKO': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA': '🇺🇸', 'PARAGUAY': '🇵🇾', 'AUSTRÁLIE': '🇦🇺', 'TURECKO': '🇹🇷',
  'NĚMECKO': '🇩🇪', 'POBŘEŽÍ SLONOVINY': '🇨🇮', 'EKVÁDOR': '🇪🇨', 'CURAÇAO': '🇨🇼',
  'NIZOZEMSKO': '🇳🇱', 'JAPONSKO': '🇯🇵', 'ŠVÉDSKO': '🇸🇪', 'TUNISKO': '🇹🇳',
  'BELGIE': '🇧🇪', 'ÍRÁN': '🇮🇷', 'EGYPT': '🇪🇬', 'NOVÝ ZÉLAND': '🇳🇿',
  'ŠPANĚLSKO': '🇪🇸', 'SAÚDSKÁ ARÁBIE': '🇸🇦', 'KAPVERDY': '🇨🇻', 'URUGUAY': '🇺🇾',
  'FRANCIE': '🇫🇷', 'SENEGAL': '🇸🇳', 'IRÁK': '🇮🇶', 'NORSKO': '🇳🇴',
  'ARGENTINA': '🇦🇷', 'ALŽÍRSKO': '🇩🇿', 'JORDÁNSKO': '🇯🇴', 'RAKOUSKO': '🇦🇹',
  'PORTUGALSKO': '🇵🇹', 'DR KONGO': '🇨🇩', 'KOLUMBIE': '🇨🇴', 'UZBEKISTÁN': '🇺🇿',
  'ANGLIE': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'CHORVATSKO': '🇭🇷', 'GHANA': '🇬🇭', 'PANAMA': '🇵🇦',
  'JIŽNÍ AFRIKA': '🇿🇦',
};

function getFlag(team: string) {
  return FLAGS[team.toUpperCase()] ?? '🏳️';
}

export default function ScorerSelect({ homeTeam, awayTeam, homePlayers, awayPlayers, value, onChange, dark }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (name: string) => { onChange(name); setOpen(false); };
  const clear = () => { onChange(''); setOpen(false); };

  const d = {
    trigger: dark
      ? 'bg-slate-900 border-slate-600 text-yellow-300 hover:border-yellow-500'
      : 'bg-gray-50 border-gray-300 text-yellow-700 hover:border-yellow-500',
    dropdown: dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200',
    homeHeader: dark ? 'bg-blue-900/50 text-blue-200' : 'bg-blue-50 text-blue-800',
    awayHeader: dark ? 'bg-orange-900/50 text-orange-200' : 'bg-orange-50 text-orange-800',
    homeItem: dark ? 'text-blue-100 hover:bg-blue-900/40' : 'text-blue-900 hover:bg-blue-50',
    awayItem: dark ? 'text-orange-100 hover:bg-orange-900/40' : 'text-orange-900 hover:bg-orange-50',
    pos: dark ? 'text-slate-500' : 'text-gray-400',
    divider: dark ? 'border-slate-600' : 'border-gray-200',
    clearBtn: dark ? 'text-slate-400 hover:text-white bg-slate-700/50' : 'text-gray-500 hover:text-gray-800 bg-gray-100',
  };

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between border rounded-lg px-2 py-1.5 text-xs focus:outline-none transition ${d.trigger}`}
      >
        <span className={value ? '' : (dark ? 'text-slate-500' : 'text-gray-400')}>
          {value ? `⚽ ${value}` : '⚽ Tip na střelce (+3b) — nepovinné'}
        </span>
        <span className="ml-1 opacity-40 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute z-50 w-full mt-1 border rounded-xl overflow-hidden shadow-2xl ${d.dropdown}`} style={{ maxHeight: '300px', overflowY: 'auto' }}>

          {/* Zrušit */}
          {value && (
            <button onClick={clear} className={`w-full text-left px-3 py-1.5 text-xs font-semibold ${d.clearBtn} border-b ${d.divider}`}>
              ✕ Zrušit výběr
            </button>
          )}

          {/* Domácí tým — modrá */}
          {homePlayers.length > 0 && (
            <div>
              <div className={`px-3 py-1.5 text-xs font-bold tracking-wide flex items-center gap-1.5 ${d.homeHeader}`}>
                <span>{getFlag(homeTeam)}</span>
                <span>{homeTeam}</span>
              </div>
              {homePlayers.map((p, i) => {
                const isLast = i === homePlayers.length - 1;
                return (
                  <div key={p.name}>
                    <button
                      onClick={() => select(p.name)}
                      className={`w-full text-left px-4 py-1.5 text-xs flex items-center justify-between transition ${d.homeItem} ${value === p.name ? 'font-bold' : ''}`}
                    >
                      <span>{value === p.name ? '✓ ' : ''}{p.name}</span>
                      <span className={`ml-2 text-[10px] ${d.pos}`}>{POS_SHORT[p.position] ?? p.position[0]}</span>
                    </button>
                    {isLast && awayPlayers.length > 0 && (
                      <div className={`border-t-2 ${d.divider} mx-2`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Hosté — oranžová */}
          {awayPlayers.length > 0 && (
            <div>
              <div className={`px-3 py-1.5 text-xs font-bold tracking-wide flex items-center gap-1.5 ${d.awayHeader}`}>
                <span>{getFlag(awayTeam)}</span>
                <span>{awayTeam}</span>
              </div>
              {awayPlayers.map(p => (
                <button
                  key={p.name}
                  onClick={() => select(p.name)}
                  className={`w-full text-left px-4 py-1.5 text-xs flex items-center justify-between transition ${d.awayItem} ${value === p.name ? 'font-bold' : ''}`}
                >
                  <span>{value === p.name ? '✓ ' : ''}{p.name}</span>
                  <span className={`ml-2 text-[10px] ${d.pos}`}>{POS_SHORT[p.position] ?? p.position[0]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
