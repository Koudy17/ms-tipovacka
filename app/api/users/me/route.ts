import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get('session_token')?.value;
  if (!sessionToken) return NextResponse.json({ error: 'No session' }, { status: 401 });

  const sql = getSql();
  const rows = await sql`
    SELECT u.id, u.nickname, u.must_change_password
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${sessionToken} AND s.expires_at > NOW()
  `;
  if (!rows.length) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  const user = rows[0];
  return NextResponse.json({
    id: user.id,
    nickname: user.nickname,
    mustChangePassword: user.must_change_password ?? false,
  });
}
