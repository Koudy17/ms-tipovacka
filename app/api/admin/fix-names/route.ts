import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { checkAdminAuth } from '@/lib/adminAuth';

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
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });

  const sql = getSql();
  let updated = 0;
  for (const [eng, cz] of Object.entries(FIXES)) {
    await sql`UPDATE matches SET home_team = ${cz} WHERE home_team = ${eng}`;
    await sql`UPDATE matches SET away_team = ${cz} WHERE away_team = ${eng}`;
    updated++;
  }
  return NextResponse.json({ ok: true, updated });
}
