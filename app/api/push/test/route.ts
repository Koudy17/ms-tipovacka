import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { sendToUser } from '@/lib/push';
import { rateLimit } from '@/lib/rateLimit';

// Zkušební upozornění sobě – ať si uživatel ověří, že mu notifikace chodí.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });
  if (!rateLimit(`pushtest:${userId}`, 5, 60_000).allowed) {
    return NextResponse.json({ error: 'Moc pokusů, zkus to za chvíli.' }, { status: 429 });
  }
  const delivered = await sendToUser(userId, {
    title: '✅ Upozornění fungují',
    body: 'Takhle budeš dostávat připomínky před zápasy a výsledky svých tipů.',
    url: '/',
    tag: 'test',
  });
  if (!delivered) return NextResponse.json({ error: 'Žádné zařízení nepřijalo upozornění. Zkus je vypnout a zapnout znovu.' }, { status: 502 });
  return NextResponse.json({ ok: true, delivered });
}
