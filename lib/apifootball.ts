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
    home: { id: number; name: string; logo: string | null };
    away: { id: number; name: string; logo: string | null };
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

async function apiGet(apiKey: string, path: string, params: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
  const res = await fetch(`${BASE}${path}?${qs}`, {
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

export async function fetchFixtures(
  apiKey: string,
  params: Record<string, string | number>,
): Promise<ApiFixture[]> {
  return apiGet(apiKey, '/fixtures', {
    league: PL_LEAGUE_ID,
    season: PL_SEASON,
    timezone: 'UTC',
    ...params,
  });
}

const POSITIONS: Record<string, string> = {
  Goalkeeper: 'Brankář', Defender: 'Obránce', Midfielder: 'Záložník', Attacker: 'Útočník',
};

export interface SquadPlayer { id: number; name: string; position: string }

// Soupiska týmu (hráči se pozicemi česky)
export async function fetchSquad(apiKey: string, teamId: number): Promise<SquadPlayer[]> {
  const res = await apiGet(apiKey, '/players/squads', { team: teamId });
  const players: { id: number; name: string; position: string }[] = res[0]?.players ?? [];
  return players.map(p => ({ id: p.id, name: p.name, position: POSITIONS[p.position] ?? p.position }));
}

export interface GoalScorer { id: number; name: string }

// Střelci zápasu: normální gól a penalta se počítají, vlastní gól ne
export async function fetchGoalScorers(apiKey: string, fixtureId: number): Promise<GoalScorer[]> {
  const events: { type: string; detail: string; player: { id: number | null; name: string | null } }[] =
    await apiGet(apiKey, '/fixtures/events', { fixture: fixtureId });
  return events
    .filter(e => e.type === 'Goal' && (e.detail === 'Normal Goal' || e.detail === 'Penalty') && e.player?.id && e.player?.name)
    .map(e => ({ id: e.player.id as number, name: e.player.name as string }));
}

// ---------- Data pro vizuální části (tabulka ligy, živé zápasy, forma, střelci) ----------

export interface StandingRow {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  form: string | null; // např. "WWDLW"
  description: string | null; // "Promotion - Champions League …", "Relegation - Championship"
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

export async function fetchStandings(apiKey: string): Promise<StandingRow[]> {
  const res = await apiGet(apiKey, '/standings', { league: PL_LEAGUE_ID, season: PL_SEASON });
  return res[0]?.league?.standings?.[0] ?? [];
}

export interface TopScorer {
  player: { id: number; name: string; photo: string };
  team: { id: number; name: string; logo: string };
  goals: number;
  assists: number;
  played: number;
}

export async function fetchTopScorers(apiKey: string): Promise<TopScorer[]> {
  const res = await apiGet(apiKey, '/players/topscorers', { league: PL_LEAGUE_ID, season: PL_SEASON });
  return res.slice(0, 15).map((r: { player: TopScorer['player']; statistics: { team: TopScorer['team']; goals: { total: number | null; assists: number | null }; games: { appearences: number | null } }[] }) => {
    const s = r.statistics[0];
    return {
      player: { id: r.player.id, name: r.player.name, photo: r.player.photo },
      team: { id: s.team.id, name: s.team.name, logo: s.team.logo },
      goals: s.goals.total ?? 0,
      assists: s.goals.assists ?? 0,
      played: s.games.appearences ?? 0,
    };
  });
}

export interface LiveFixture {
  id: number;
  status: string;
  minute: number | null;
  extra: number | null;
  home: { id: number; name: string; goals: number | null };
  away: { id: number; name: string; goals: number | null };
}

// Všechny právě hrané zápasy PL (jeden požadavek)
export async function fetchLive(apiKey: string): Promise<LiveFixture[]> {
  const res: { league: { id: number }; fixture: { id: number; status: { short: string; elapsed: number | null; extra: number | null } }; teams: { home: { id: number; name: string }; away: { id: number; name: string } }; goals: { home: number | null; away: number | null } }[] =
    await apiGet(apiKey, '/fixtures', { live: 'all' }); // API neumí filtr na jednu ligu, filtrujeme sami
  return res.filter(f => f.league.id === PL_LEAGUE_ID).map(f => ({
    id: f.fixture.id,
    status: f.fixture.status.short,
    minute: f.fixture.status.elapsed,
    extra: f.fixture.status.extra,
    home: { id: f.teams.home.id, name: f.teams.home.name, goals: f.goals.home },
    away: { id: f.teams.away.id, name: f.teams.away.name, goals: f.goals.away },
  }));
}

export interface MatchEvent {
  minute: number;
  extra: number | null;
  type: 'goal' | 'own-goal' | 'penalty' | 'yellow' | 'red';
  teamId: number;
  playerId: number | null;
  player: string | null;
}

// Průběh zápasu: góly (i vlastní a penalty) a karty
export async function fetchEvents(apiKey: string, fixtureId: number): Promise<MatchEvent[]> {
  const res: { time: { elapsed: number; extra: number | null }; team: { id: number }; player: { id: number | null; name: string | null }; type: string; detail: string }[] =
    await apiGet(apiKey, '/fixtures/events', { fixture: fixtureId });
  const out: MatchEvent[] = [];
  for (const e of res) {
    let type: MatchEvent['type'] | null = null;
    if (e.type === 'Goal') {
      if (e.detail === 'Normal Goal') type = 'goal';
      else if (e.detail === 'Penalty') type = 'penalty';
      else if (e.detail === 'Own Goal') type = 'own-goal';
    } else if (e.type === 'Card') {
      type = e.detail === 'Yellow Card' ? 'yellow' : e.detail.includes('Red') ? 'red' : null;
    }
    if (type) out.push({ minute: e.time.elapsed, extra: e.time.extra, type, teamId: e.team.id, playerId: e.player?.id ?? null, player: e.player?.name ?? null });
  }
  return out;
}

export interface H2HGame {
  date: string;
  home: { id: number; name: string; goals: number | null };
  away: { id: number; name: string; goals: number | null };
}

// Posledních 5 vzájemných zápasů (jakákoli soutěž)
export async function fetchH2H(apiKey: string, teamA: number, teamB: number): Promise<H2HGame[]> {
  const res: { fixture: { date: string; status: { short: string } }; teams: { home: { id: number; name: string }; away: { id: number; name: string } }; goals: { home: number | null; away: number | null } }[] =
    await apiGet(apiKey, '/fixtures/headtohead', { h2h: `${teamA}-${teamB}`, last: 5 });
  return res
    .filter(f => FINISHED.has(f.fixture.status.short))
    .map(f => ({
      date: f.fixture.date,
      home: { id: f.teams.home.id, name: f.teams.home.name, goals: f.goals.home },
      away: { id: f.teams.away.id, name: f.teams.away.name, goals: f.goals.away },
    }));
}
