import { NextRequest, NextResponse } from 'next/server';
import { getSql, initSchema } from '@/lib/db';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

const NAMES: Record<string, string> = {
  'Mexico': 'Mexiko', 'South Africa': 'JiĹľnĂ­ Afrika', 'South Korea': 'JiĹľnĂ­ Korea',
  'Czechia': 'ÄŚesko', 'Canada': 'Kanada', 'Bosnia-Herzegovina': 'Bosna a Hercegovina',
  'United States': 'USA', 'Panama': 'Panama', 'Argentina': 'Argentina',
  'Morocco': 'Maroko', 'Spain': 'Ĺ panÄ›lsko', 'Serbia': 'Srbsko',
  'Germany': 'NÄ›mecko', 'Japan': 'Japonsko', 'Portugal': 'Portugalsko',
  'France': 'Francie', 'Uruguay': 'Uruguay', 'Belgium': 'Belgie',
  'Netherlands': 'Nizozemsko', 'Croatia': 'Chorvatsko', 'England': 'Anglie',
  'Brazil': 'BrazĂ­lie', 'Australia': 'AustrĂˇlie', 'Colombia': 'Kolumbie',
  'Italy': 'ItĂˇlie', 'Ecuador': 'EkvĂˇdor', 'Switzerland': 'Ĺ vĂ˝carsko',
  'Sweden': 'Ĺ vĂ©dsko', 'Denmark': 'DĂˇnsko', 'Poland': 'Polsko',
  'Romania': 'Rumunsko', 'Hungary': 'MaÄŹarsko', 'Slovakia': 'Slovensko',
  'Ukraine': 'Ukrajina', 'Turkey': 'Turecko', 'Saudi Arabia': 'SaĂşdskĂˇ ArĂˇbie',
  'Iran': 'ĂŤrĂˇn', 'Nigeria': 'NigĂ©rie', 'Cameroon': 'Kamerun',
  'Senegal': 'Senegal', 'Ghana': 'Ghana', 'Egypt': 'Egypt',
  'Ivory Coast': 'PobĹ™eĹľĂ­ slonoviny', 'Algeria': 'AlĹľĂ­rsko', 'Tunisia': 'Tunisko',
  'Paraguay': 'Paraguay', 'Chile': 'Chile', 'Venezuela': 'Venezuela',
  'Peru': 'Peru', 'Bolivia': 'BolĂ­vie', 'Qatar': 'Katar',
  'Indonesia': 'IndonĂ©sie', 'Honduras': 'Honduras', 'Guatemala': 'Guatemala',
  'Costa Rica': 'Kostarika', 'Jamaica': 'Jamajka', 'El Salvador': 'Salvador',
  'New Zealand': 'NovĂ˝ ZĂ©land', 'Korea Republic': 'JiĹľnĂ­ Korea',
  'Austria': 'Rakousko', 'Iraq': 'IrĂˇk', 'Jordan': 'JordĂˇnsko',
  'Norway': 'Norsko', 'Scotland': 'Skotsko', 'Uzbekistan': 'UzbekistĂˇn',
  'Cape Verde Islands': 'Kapverdy', 'Congo DR': 'DR Kongo',
};

function czName(name: string) {
  return NAMES[name] ?? name;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-token');
  if (auth !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'NeautorizovĂˇno.' }, { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ChybĂ­ FOOTBALL_API_KEY.' }, { status: 500 });

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
