import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { checkAdminAuth } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });

  const sql = getSql();
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 100);

  const rows = await sql`
    SELECT id, ts, action, entity, details, actor
    FROM audit_log
    ORDER BY ts DESC
    LIMIT ${limit}
  `;
  return NextResponse.json(rows);
}
