import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    const valid = checkAdminAuth(req);
    return NextResponse.json({ ok: valid }, { status: valid ? 200 : 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
