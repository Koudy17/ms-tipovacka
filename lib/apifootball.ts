// Klient pro API-Football (api-football.com, v3). Premier League = league 39.
const BASE = 'https://v3.football.api-sports.io';

export const PL_LEAGUE_ID = 39;
export const PL_SEASON = Number(process.env.PL_SEASON ?? 2026); // sezóna 2026/27
// Tipovačka startuje až od tohoto kola, dřívější kola se neimportují
export const PL_FIRST_MATCHDAY = Number(process.env.PL_FIRST_MATCHDAY ?? 6);

export interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { round: string };
  teams: {
    home: { name: string; logo: string | null };
    away: { name: string; logo: string | null };
  };
  goals: { home: number | null; away: number | null };
  score: { fulltime: { home: number | null; away: number | null } };
}

const FINISHED = new Set(['FT', 'AET', 'PEN']);
const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT', 'SUSP']);

export type MatchState = 'finished' | 'live' | 'scheduled' | 'other';

export function matchState(short: string): MatchState {
  if (FINISHED.has(short)) return 'finished';
  if (LIVE.has(short)) return 'live';
  if (short === 'NS' || short === 'TBD') return 'scheduled';
  return 'other'; // PST, CANC, ABD, AWD, WO …
}

// "Regular Season - 8" → 8
export function roundNumber(round: string): number | null {
  const m = round.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

export async function fetchFixtures(
  apiKey: string,
  params: Record<string, string | number>,
): Promise<ApiFixture[]> {
  const qs = new URLSearchParams({
    league: String(PL_LEAGUE_ID),
    season: String(PL_SEASON),
    timezone: 'UTC',
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const res = await fetch(`${BASE}/fixtures?${qs}`, {
    headers: { 'x-apisports-key': apiKey },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API-Football HTTP ${res.status}`);
  const body = await res.json();
  // API vrací chyby (limit, špatný klíč, plán) i s HTTP 200 – pole je prázdné, objekt má klíče
  const errors = body.errors;
  if (errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0)) {
    throw new Error(`API-Football: ${JSON.stringify(errors)}`);
  }
  return body.response ?? [];
}
