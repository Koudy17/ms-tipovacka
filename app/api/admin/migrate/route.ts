import { NextRequest, NextResponse } from 'next/server';
import { initSchema } from '@/lib/db';
import { checkAdminAuth } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  await initSchema();
  return NextResponse.json({ ok: true });
}
