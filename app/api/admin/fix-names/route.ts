import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'admin123';

const FIXES: Record<string, string> = {
  'Scotland': 'Skotsko',
  'Uzbekistan': 'Uzbekistán',
  'Austria': 'Rakousko',
  'Iraq': 'Irák',
  'Jordan': 'Jordánsko',
  'Norway': 'Norsko',
  'Cape Verde Islands': 'Kapverdy',
  'Congo DR': 'DR Kongo',
  'South Africa': 'Jižní Afrika',
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-token');
  if (auth !== ADMIN_TOKEN) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });

  const sql = getSql();
  let updated = 0;
  for (const [eng, cz] of Object.entries(FIXES)) {
    const r1 = await sql`UPDATE matches SET home_team = ${cz} WHERE home_team = ${eng}`;
    const r2 = await sql`UPDATE matches SET away_team = ${cz} WHERE away_team = ${eng}`;
    updated += (r1.count ?? 0) + (r2.count ?? 0);
  }
  return NextResponse.json({ ok: true, updated });
}
