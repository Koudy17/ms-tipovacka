import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

const FIXES: Record<string, string> = {
  'Scotland': 'Skotsko',
  'Uzbekistan': 'UzbekistĂˇn',
  'Austria': 'Rakousko',
  'Iraq': 'IrĂˇk',
  'Jordan': 'JordĂˇnsko',
  'Norway': 'Norsko',
  'Cape Verde Islands': 'Kapverdy',
  'Congo DR': 'DR Kongo',
  'South Africa': 'JiĹľnĂ­ Afrika',
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-token');
  if (auth !== ADMIN_TOKEN) return NextResponse.json({ error: 'NeautorizovĂˇno.' }, { status: 401 });

  const sql = getSql();
  let updated = 0;
  for (const [eng, cz] of Object.entries(FIXES)) {
    await sql`UPDATE matches SET home_team = ${cz} WHERE home_team = ${eng}`;
    await sql`UPDATE matches SET away_team = ${cz} WHERE away_team = ${eng}`;
    updated++;
  }
  return NextResponse.json({ ok: true, updated });
}
