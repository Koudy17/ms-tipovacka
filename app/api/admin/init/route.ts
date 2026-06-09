import { NextRequest, NextResponse } from 'next/server';
import { getSql, initSchema } from '@/lib/db';
import { checkAdminAuth } from '@/lib/adminAuth';

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

function czName(name: string) {
  return NAMES[name] ?? name;
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });

  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Chybí FOOTBALL_API_KEY.' }, { status: 500 });

  await initSchema();
  const sql = getSql();

  const res = await fetch('https://api.football-data.org/v4/competitions/2000/matches', {
    headers: { 'X-Auth-Token': apiKey }, cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json({ error: `API error: ${res.status}` }, { status: 502 });

  const data = await res.json();
  const matches = data.matches ?? [];

  let inserted = 0;
  for (const m of matches) {
    const home = m.homeTeam?.name ? czName(m.homeTeam.name) : 'TBD';
    const away = m.awayTeam?.name ? czName(m.awayTeam.name) : 'TBD';
    const homeGoals = m.score?.fullTime?.home ?? null;
    const awayGoals = m.score?.fullTime?.away ?? null;
    const status = m.status === 'FINISHED' ? 'finished' : 'scheduled';

    await sql`
      INSERT INTO matches (id, home_team, away_team, kickoff, home_score, away_score, status, stage, matchday, group_name)
      VALUES (${m.id}, ${home}, ${away}, ${m.utcDate}, ${homeGoals}, ${awayGoals}, ${status}, ${m.stage}, ${m.matchday}, ${m.group ?? null})
      ON CONFLICT (id) DO UPDATE SET
        home_team = EXCLUDED.home_team,
        away_team = EXCLUDED.away_team,
        kickoff = EXCLUDED.kickoff,
        stage = EXCLUDED.stage,
        matchday = EXCLUDED.matchday,
        group_name = EXCLUDED.group_name
    `;
    inserted++;
  }

  return NextResponse.json({ ok: true, inserted });
}
