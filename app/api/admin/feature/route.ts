import { NextRequest, NextResponse } from 'next/server';
import { getSql, auditLog } from '@/lib/db';
import { checkAdminAuth } from '@/lib/adminAuth';

// Zobrazí / skryje zápasy v tipovačce (tipy a body zůstanou uložené).
//   POST { "ids": [1234], "featured": false }
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  const { ids, featured } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length || typeof featured !== 'boolean' || ids.some((x: unknown) => !Number.isInteger(x))) {
    return NextResponse.json({ error: 'Pošli ids: [číslo, …] a featured: true/false.' }, { status: 400 });
  }
  const rows = await getSql()`UPDATE matches SET featured = ${featured} WHERE id = ANY(${ids}) RETURNING id`;
  await auditLog('FEATURE', 'match', { ids, featured }, 'admin');
  return NextResponse.json({ ok: true, changed: rows.length });
}
