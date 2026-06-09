import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return NextResponse.json({ ok: false }, { status: 500 });
  const valid = req.headers.get('x-admin-token') === token;
  return NextResponse.json({ ok: valid }, { status: valid ? 200 : 401 });
}
