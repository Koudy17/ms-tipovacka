import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { calcPoints } from '@/lib/scoring';
import { checkAdminAuth } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isAdmin = checkAdminAuth(req);

  if (!isVercelCron && !isAdmin) {
    return NextResponse.json({ error: 'Neautorizovano.' }, { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Chybi FOOTBALL_API_KEY.' }, { status: 500 });
  }

  const sql = getSql();

  const NAMES: Record<string, string> = {
    'Mexico': 'Mexiko', 'South Africa': 'Jižní Afrika', 'South Korea': 'Jižní Korea',
    'Czechia': 'Česko', 'Canada': 'Kanada', 'Bosnia-Herzegovina': 'Bosna a Hercegovina',
    'United States': 'USA', 'Panama': 'Panama', 'Argentina': 'Argentina',
    'Morocco': 'Maroko', 'Spain': 'Španělsko', 'Serbia': 'Srbsko',
    'Germany': 'Německo', 'Japan': 'Japonsko', 'Portugal': 'Portugalsko',
    'France': 'Francie', 'Uruguay': 'Uruguay', 'Belgium': 'Belgie',
    'Netherlands': 'Nizozemsko', 'Croatia': 'Chorvatsko', 'England': 'Anglie',
    'Brazil': 'Brazílie', 'Australia': 'Austrálie', 'Colombia': 'Kolumbie',
    'Italy': 'Itálie', 'Ecuador': 'Ekvádor', 'Switzerland': 'Švýcarsko',
    'Sweden': 'Švédsko', 'Denmark': 'Dánsko', 'Poland': 'Polsko',
    'Romania': 'Rumunsko', 'Hungary': 'Maďarsko', 'Slovakia': 'Slovensko',
    'Ukraine': 'Ukrajina', 'Turkey': 'Turecko', 'Saudi Arabia': 'Saúdská Arábie',
    'Iran': 'Írán', 'Nigeria': 'Nigérie', 'Cameroon': 'Kamerun',
    'Senegal': 'Senegal', 'Ghana': 'Ghana', 'Egypt': 'Egypt',
    'Ivory Coast': 'Pobřeží slonoviny', 'Algeria': 'Alžírsko', 'Tunisia': 'Tunisko',
    'Paraguay': 'Paraguay', 'Chile': 'Chile', 'Venezuela': 'Venezuela',
    'Peru': 'Peru', 'Bolivia': 'Bolívie', 'Qatar': 'Katar',
    'Indonesia': 'Indonésie', 'Honduras': 'Honduras', 'Guatemala': 'Guatemala',
    'Costa Rica': 'Kostarika', 'Jamaica': 'Jamajka', 'El Salvador': 'Salvador',
    'New Zealand': 'Nový Zéland', 'Korea Republic': 'Jižní Korea',
    'Austria': 'Rakousko', 'Iraq': 'Irák', 'Jordan': 'Jordánsko',
    'Norway': 'Norsko', 'Scotland': 'Skotsko', 'Uzbekistan': 'Uzbekistán',
    'Cape Verde Islands': 'Kapverdy', 'Congo DR': 'DR Kongo',
  };
  const czName = (n: string) => NAMES[n] ?? n;

  const STAGE_MAP: Record<string, string> = {
    GROUP_STAGE: 'Skupinová fáze',
    LAST_32: 'Šestnáctifinále',
    LAST_16: 'Osmifinále',
    QUARTER_FINALS: 'Čtvrtfinále',
    SEMI_FINALS: 'Semifinále',
    THIRD_PLACE: 'O 3. místo',
    FINAL: 'Finále',
  };

  // Načti API + DB zároveň
  const [resFinished, resScheduled, dbMatches] = await Promise.all([
    fetch('https://api.football-data.org/v4/competitions/2000/matches?status=FINISHED', { headers: { 'X-Auth-Token': apiKey }, cache: 'no-store' }),
    fetch('https://api.football-data.org/v4/competitions/2000/matches?status=SCHEDULED', { headers: { 'X-Auth-Token': apiKey }, cache: 'no-store' }),
    sql`SELECT id, home_team, away_team, status FROM matches`,
  ]);
  if (!resFinished.ok) return NextResponse.json({ error: `API error: ${resFinished.status}` }, { status: 502 });

  const dataFinished = await resFinished.json();
  const dataScheduled = resScheduled.ok ? await resScheduled.json() : { matches: [] };
  const apiMatches = [...(dataFinished.matches ?? []), ...(dataScheduled.matches ?? [])];

  // Index DB zápasů podle ID pro rychlé vyhledání
  const dbIndex = new Map<number, { status: string; home_team: string; away_team: string }>();
  for (const m of dbMatches) {
    dbIndex.set(m.id, { status: m.status, home_team: m.home_team, away_team: m.away_team });
  }

  let updated = 0;
  let inserted = 0;
  let teamsUpdated = 0;
  const toInsert: Array<{ id: number; home: string; away: string; kickoff: string; stage: string }> = [];
  const toUpdate: Array<{ id: number; home: number; away: number }> = [];
  const toUpdateTeams: Array<{ id: number; home: string; away: string; kickoff: string }> = [];

  for (const am of apiMatches) {
    const matchId = am.id;
    const homeName = am.homeTeam?.name ? czName(am.homeTeam.name) : null;
    const awayName = am.awayTeam?.name ? czName(am.awayTeam.name) : null;
    const kickoff = am.utcDate;
    const stage = STAGE_MAP[am.stage] ?? am.stage ?? 'Skupinová fáze';
    if (!matchId || !homeName || !awayName || !kickoff) continue;

    const existing = dbIndex.get(matchId);

    if (!existing) {
      toInsert.push({ id: matchId, home: homeName, away: awayName, kickoff, stage });
      continue;
    }

    // Aktualizuj týmy pokud se změnily (TBD → skutečný tým)
    if (existing.status !== 'finished' && (existing.home_team !== homeName || existing.away_team !== awayName)) {
      toUpdateTeams.push({ id: matchId, home: homeName, away: awayName, kickoff });
    }

    // regularTime = pouze 90 min (bez prodloužení a penalt)
    const homeGoals = am.score?.regularTime?.home ?? am.score?.fullTime?.home;
    const awayGoals = am.score?.regularTime?.away ?? am.score?.fullTime?.away;
    if (homeGoals == null || awayGoals == null) continue;
    if (existing.status === 'finished') continue;

    toUpdate.push({ id: matchId, home: homeGoals, away: awayGoals });
  }

  // Aktualizuj názvy týmů u playoff zápasů (TBD → postoupivší tým)
  for (const m of toUpdateTeams) {
    await sql`UPDATE matches SET home_team = ${m.home}, away_team = ${m.away}, kickoff = ${m.kickoff} WHERE id = ${m.id}`;
    teamsUpdated++;
  }

  // Batch insert nových zápasů (jen skupinová fáze, knockout se přidává ručně s českými názvy)
  for (const m of toInsert) {
    await sql`INSERT INTO matches (id, home_team, away_team, kickoff, stage, status) VALUES (${m.id}, ${m.home}, ${m.away}, ${m.kickoff}, ${m.stage}, 'upcoming') ON CONFLICT (id) DO NOTHING`;
    inserted++;
  }

  // Update výsledků + body
  for (const m of toUpdate) {
    await sql`UPDATE matches SET home_score = ${m.home}, away_score = ${m.away}, status = 'finished' WHERE id = ${m.id}`;
    const tips = await sql`SELECT * FROM tips WHERE match_id = ${m.id}`;
    for (const tip of tips) {
      const pts = calcPoints(m.home, m.away, tip.home_tip, tip.away_tip);
      await sql`UPDATE tips SET points = ${pts} WHERE id = ${tip.id}`;
    }
    updated++;
  }

  return NextResponse.json({ ok: true, updatedMatches: updated, insertedMatches: inserted, teamsUpdated });
}
