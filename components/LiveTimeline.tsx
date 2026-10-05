export interface LiveEvent {
  minute: number;
  extra: number | null;
  type: 'goal' | 'own-goal' | 'penalty' | 'yellow' | 'red';
  teamId: number;
  playerId: number | null;
  player: string | null;
}

const ICON: Record<LiveEvent['type'], string> = { goal: '⚽', penalty: '⚽', 'own-goal': '⚽', yellow: '🟨', red: '🟥' };
const LABEL: Record<LiveEvent['type'], string> = { goal: '', penalty: ' (pen.)', 'own-goal': ' (vlastní)', yellow: '', red: '' };

// Průběh zápasu: góly a karty, domácí vlevo, hosté vpravo
export default function LiveTimeline({ events, homeTeamId, dark }: { events: LiveEvent[]; homeTeamId: number | null; dark: boolean }) {
  if (!events.length) return <p className={`text-xs text-center ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Zatím žádné góly ani karty.</p>;
  const sub = dark ? 'text-slate-400' : 'text-gray-500';
  return (
    <div className="space-y-1">
      {events.map((e, i) => {
        const isHome = e.teamId === homeTeamId;
        // vlastní gól se připíše soupeři
        const left = e.type === 'own-goal' ? !isHome : isHome;
        const body = (
          <span className={`flex items-center gap-1 text-xs ${dark ? 'text-slate-200' : 'text-gray-800'} ${left ? '' : 'flex-row-reverse'}`}>
            <span>{ICON[e.type]}</span>
            {e.playerId && (e.type === 'goal' || e.type === 'penalty') && (
              <img src={`https://media.api-sports.io/football/players/${e.playerId}.png`} alt="" className="h-5 w-5 rounded-full object-cover bg-slate-600" loading="lazy" />
            )}
            <span className="truncate">{e.player}{LABEL[e.type]}</span>
          </span>
        );
        return (
          <div key={i} className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 2.6rem 1fr' }}>
            <div className="min-w-0">{left ? body : null}</div>
            <div className={`text-center text-[11px] tabular-nums ${sub}`}>{e.minute}{e.extra ? `+${e.extra}` : ''}&apos;</div>
            <div className="min-w-0">{!left ? body : null}</div>
          </div>
        );
      })}
    </div>
  );
}
