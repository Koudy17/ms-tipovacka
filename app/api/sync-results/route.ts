import { NextRequest, NextResponse } from 'next/server';
import { getSql, initSchema } from '@/lib/db';
import { calcPoints } from '@/lib/scoring';
import { checkAdminAuth } from '@/lib/adminAuth';
import { sendResults } from '@/lib/notify';
import { fetchFixtures, matchState, roundNumber, PL_FIRST_MATCHDAY, type ApiFixture } from '@/lib/apifootball';

// mode=full (výchozí): stáhne celou sezónu – nové zápasy, přesuny, výsledky. Cron 1× denně + admin.
// mode=live: levný průchod kolem začátku zápasů – bez zápasu v okně nevolá API vůbec.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isCron && !checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Neautorizovano.' }, { status: 401 });
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Chybi API_FOOTBALL_KEY.' }, { status: 500 });

  const live = req.nextUrl.searchParams.get('mode') === 'live';
  const sql = getSql();

  let fixtures: ApiFixture[];
  try {
    if (live) {
      // Zápasy, které začaly před <3 h nebo začnou za <10 min a nejsou dohrané
      const active = await sql`
        SELECT 1 FROM matches
        WHERE status != 'finished'
          AND kickoff > NOW() - INTERVAL '3 hours'
          AND kickoff < NOW() + INTERVAL '10 minutes'
        LIMIT 1`;
      if (active.length === 0) return NextResponse.json({ ok: true, skipped: true });

      // Dotaz po dnech: zachytí i zápas, který právě skončil (v live=all feedu už není)
      const now = Date.now();
      const days = [...new Set([now, now - 3 * 3600 * 1000].map(t => new Date(t).toISOString().slice(0, 10)))];
      fixtures = (await Promise.all(days.map(date => fetchFixtures(apiKey, { date })))).flat();
    } else {
      fixtures = await fetchFixtures(apiKey, {});
    }
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 502 });
  }

  // Sloupce pro znaky klubů se doplní automaticky při prvním běhu
  try {
    await sql`SELECT home_logo FROM matches LIMIT 1`;
    await sql`SELECT is_double FROM tips LIMIT 1`;
  } catch {
    await initSchema();
  }

  const dbMatches = await sql`SELECT id, home_team, away_team, kickoff, status, home_score, away_score, matchday FROM matches`;
  const db = new Map(dbMatches.map(m => [m.id as number, m]));

  let inserted = 0, updated = 0, finishedNow = 0;
  const finishedIds: number[] = [];

  for (const f of fixtures) {
    const id = f.fixture.id;
    const home = f.teams.home.name;
    const away = f.teams.away.name;
    const kickoff = new Date(f.fixture.date).toISOString();
    const state = matchState(f.fixture.status.short);
    const matchday = roundNumber(f.league.round);
    if (matchday != null && matchday < PL_FIRST_MATCHDAY) continue;
    const hl = f.teams.home.logo, al = f.teams.away.logo;
    const existing = db.get(id);

    if (!existing) {
      await sql`
        INSERT INTO matches (id, home_team, away_team, kickoff, stage, matchday, status, home_logo, away_logo)
        VALUES (${id}, ${home}, ${away}, ${kickoff}, 'REGULAR_SEASON', ${matchday}, 'scheduled', ${hl}, ${al})
        ON CONFLICT (id) DO NOTHING`;
      inserted++;
      // pokračuj – zápas může být rovnou dohraný/živý (první import uprostřed sezóny)
    }

    const wasFinished = existing?.status === 'finished';
    const hs = f.score.fulltime.home ?? f.goals.home;
    const as = f.score.fulltime.away ?? f.goals.away;

    // Údaje o zápase (přesuny termínu, názvy, znaky) – po dohrání už neměnit
    if (existing && !wasFinished) {
      await sql`
        UPDATE matches SET home_team = ${home}, away_team = ${away}, kickoff = ${kickoff},
          matchday = ${matchday}, home_logo = ${hl}, away_logo = ${al}
        WHERE id = ${id}`;
    }

    if (state === 'live' && hs != null && as != null) {
      await sql`UPDATE matches SET status = 'live', home_score = ${hs}, away_score = ${as} WHERE id = ${id}`;
      updated++;
    } else if (state === 'finished' && hs != null && as != null) {
      const scoreChanged = existing && (existing.home_score !== hs || existing.away_score !== as);
      if (wasFinished && !scoreChanged) continue;
      await sql`UPDATE matches SET status = 'finished', home_score = ${hs}, away_score = ${as} WHERE id = ${id}`;
      const tips = await sql`SELECT id, home_tip, away_tip FROM tips WHERE match_id = ${id}`;
      for (const tip of tips) {
        await sql`UPDATE tips SET points = ${calcPoints(hs, as, tip.home_tip, tip.away_tip)} WHERE id = ${tip.id}`;
      }
      if (!wasFinished) { finishedNow++; finishedIds.push(id); }
      updated++;
    } else if (state === 'scheduled' && existing?.status === 'live') {
      // zápas se vrátil do plánu (chybně označený live) – srovnat
      await sql`UPDATE matches SET status = 'scheduled', home_score = NULL, away_score = NULL WHERE id = ${id}`;
    }
  }

  // Upozornění na výsledky – chyba při odesílání nesmí shodit sync
  let notified;
  try {
    notified = await sendResults(finishedIds);
  } catch (e) {
    console.error('[sync] upozornění na výsledky selhalo', e);
  }

  return NextResponse.json({ ok: true, mode: live ? 'live' : 'full', fixtures: fixtures.length, inserted, updated, finishedNow, notified });
}
