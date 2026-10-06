// Zrychlené „přehrání" skutečného odehraného zápasu PL, aby šlo vidět, jak bude appka vypadat při živém zápase.
// Data (góly, karty, střelci, fotky) jsou skutečná z API-Football, jen se promítají zrychleně.
//
//   node --env-file=.env.local scripts/simulate-match.mjs [fixtureId] [--sec 3] [--user přezdívka ...]
//   node --env-file=.env.local scripts/simulate-match.mjs --clean [fixtureId]
//
// Potřebuje API_FOOTBALL_KEY v prostředí a běžící dev server s týmž klíčem (pro závěr zápasu).
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const KEY = process.env.API_FOOTBALL_KEY;
const args = process.argv.slice(2);
const arg = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const FID = Number(args.find(a => /^\d+$/.test(a)) ?? 1379103); // Fulham 4:5 Manchester City (2. 12. 2025)
const SEC = Number(arg('--sec') ?? 3); // sekund reálného času na minutu zápasu
const NICKS = args.flatMap((a, i) => (a === '--user' ? [args[i + 1]] : []));
if (!NICKS.length) NICKS.push('zz_sim');

const log = m => console.log(`[${new Date().toLocaleTimeString('cs-CZ')}] ${m}`);

async function cleanup() {
  await sql`DELETE FROM api_cache WHERE key IN ('live', ${'events:' + FID})`;
  await sql`DELETE FROM tips WHERE match_id = ${FID}`;
  await sql`DELETE FROM notifications_sent WHERE match_id = ${FID}`;
  await sql`DELETE FROM matches WHERE id = ${FID} AND stage = 'DEMO'`;
}

if (args.includes('--clean')) {
  await cleanup();
  log('Simulace uklizena (zápas, tipy, živá data).');
  process.exit(0);
}
if (!KEY) { console.error('Chybí API_FOOTBALL_KEY.'); process.exit(1); }

async function api(path, params) {
  const res = await fetch(`https://v3.football.api-sports.io${path}?${new URLSearchParams(params)}`, { headers: { 'x-apisports-key': KEY } });
  const body = await res.json();
  if (body.errors && Object.keys(body.errors).length) throw new Error(JSON.stringify(body.errors));
  return body.response;
}

const fx = (await api('/fixtures', { id: FID }))[0];
const home = fx.teams.home, away = fx.teams.away;
const raw = await api('/fixtures/events', { fixture: FID });
const events = raw
  .map(e => {
    let type = null;
    if (e.type === 'Goal') type = e.detail === 'Penalty' ? 'penalty' : e.detail === 'Own Goal' ? 'own-goal' : e.detail === 'Normal Goal' ? 'goal' : null;
    else if (e.type === 'Card') type = e.detail === 'Yellow Card' ? 'yellow' : e.detail.includes('Red') ? 'red' : null;
    return type && { minute: e.time.elapsed, extra: e.time.extra, type, teamId: e.team.id, playerId: e.player?.id ?? null, player: e.player?.name ?? null };
  })
  .filter(Boolean)
  .sort((a, b) => a.minute + (a.extra ?? 0) * 0.01 - (b.minute + (b.extra ?? 0) * 0.01));
const eff = (m, x) => m + (x ?? 0) * 0.01;
log(`Zápas ${home.name} ${fx.goals.home}:${fx.goals.away} ${away.name}, ${events.length} událostí (góly a karty), ${SEC} s na minutu.`);

await cleanup();
await sql`
  INSERT INTO matches (id, home_team, away_team, kickoff, stage, matchday, status, home_score, away_score, home_team_id, away_team_id, home_logo, away_logo)
  VALUES (${FID}, ${home.name}, ${away.name}, NOW() - INTERVAL '1 minute', 'DEMO', 6, 'live', 0, 0, ${home.id}, ${away.id}, ${home.logo}, ${away.logo})`;

// Tip: 2:3 (správný vítěz i rozdíl = 6 b), střelec Haaland (+3 b), na zápas double → (6 + 3) × 2 = 18 b
for (const nick of NICKS) {
  const u = await sql`SELECT id FROM users WHERE nickname = ${nick}`;
  if (!u.length) { console.error(`Uživatel "${nick}" neexistuje – nejdřív ho zaregistruj.`); await cleanup(); process.exit(1); }
  await sql`INSERT INTO tips (user_id, match_id, home_tip, away_tip, scorer_tip, scorer_player_id, is_double) VALUES (${u[0].id}, ${FID}, 2, 3, 'E. Haaland', 1100, TRUE)`;
  log(`Tip pro ${nick}: 2:3, střelec E. Haaland, double.`);
}

const maxExtra = Math.max(0, ...events.filter(e => e.minute === 90).map(e => e.extra ?? 0));
const ticks = [];
for (let m = 1; m <= 45; m++) ticks.push({ status: '1H', minute: m, extra: null });
ticks.push({ status: 'HT', minute: 45, extra: null, pause: 6 });
for (let m = 46; m <= 90; m++) ticks.push({ status: '2H', minute: m, extra: null });
for (let x = 1; x <= maxExtra; x++) ticks.push({ status: '2H', minute: 90, extra: x });

let last = '';
for (const t of ticks) {
  const cur = eff(t.minute, t.extra);
  const shown = events.filter(e => eff(e.minute, e.extra) <= cur);
  // gól se přičítá týmu, který API uvádí (u vlastního gólu je to soupeř hráče)
  const hg = shown.filter(e => ['goal', 'penalty', 'own-goal'].includes(e.type) && e.teamId === home.id).length;
  const ag = shown.filter(e => ['goal', 'penalty', 'own-goal'].includes(e.type) && e.teamId === away.id).length;
  const live = [{ id: FID, status: t.status, minute: t.minute, extra: t.extra, home: { id: home.id, name: home.name, goals: hg }, away: { id: away.id, name: away.name, goals: ag } }];
  await sql`INSERT INTO api_cache (key, data, fetched_at) VALUES ('live', ${JSON.stringify(live)}::jsonb, NOW() + INTERVAL '1 hour') ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, fetched_at = EXCLUDED.fetched_at`;
  await sql`INSERT INTO api_cache (key, data, fetched_at) VALUES (${'events:' + FID}, ${JSON.stringify(shown)}::jsonb, NOW() + INTERVAL '1 hour') ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, fetched_at = EXCLUDED.fetched_at`;
  await sql`UPDATE matches SET home_score = ${hg}, away_score = ${ag}, status = 'live' WHERE id = ${FID}`;
  const line = `${t.status} ${t.minute}${t.extra ? '+' + t.extra : ''}' ${hg}:${ag}`;
  if (shown.length !== last) { log(line + `  (událostí: ${shown.length})`); last = shown.length; }
  await new Promise(r => setTimeout(r, (t.pause ?? SEC) * 1000));
}

// Konec zápasu: stejná cesta jako ostrý sync (body, střelci z API, bonus, upozornění) přes dočasný koncový bod
await sql`UPDATE matches SET home_score = ${fx.goals.home}, away_score = ${fx.goals.away} WHERE id = ${FID}`;
log(`Konec zápasu ${fx.goals.home}:${fx.goals.away}, vyhodnocuji body.`);
const res = await fetch(`http://localhost:3000/api/tmp-sim-finish?id=${FID}`, { headers: { 'x-admin-token': process.env.ADMIN_TOKEN } });
log('Vyhodnocení: ' + (await res.text()));
