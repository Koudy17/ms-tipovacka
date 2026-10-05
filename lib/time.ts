const TZ = 'Europe/Prague';

// Posun Europe/Prague oproti UTC v ms pro daný okamžik (řeší letní/zimní čas)
function pragueOffsetMs(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(d);
  const p: Record<string, number> = {};
  for (const x of parts) if (x.type !== 'literal') p[x.type] = Number(x.value);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}

/**
 * Okno "Dnes": od 8:00 pražského času do 8:00 následujícího dne.
 * Používá skutečné časové pásmo, takže přežije přechod na zimní čas.
 */
export function todayWindow(now: Date = new Date()): { from: Date; to: Date } {
  const off = pragueOffsetMs(now);
  const local = new Date(now.getTime() + off); // pražské hodnoty čteme přes getUTC*
  let baseLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 8);
  if (local.getUTCHours() < 8) baseLocal -= 24 * 3600 * 1000;
  const fromMs = baseLocal - pragueOffsetMs(new Date(baseLocal - off));
  return { from: new Date(fromMs), to: new Date(fromMs + 24 * 3600 * 1000) };
}
