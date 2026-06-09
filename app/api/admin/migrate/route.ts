import { NextRequest, NextResponse } from 'next/server';
import { initSchema } from '@/lib/db';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-token') !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await initSchema();
  return NextResponse.json({ ok: true });
}
