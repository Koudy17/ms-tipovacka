import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });

  const { subscription } = await req.json().catch(() => ({}));
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  // Jen skutečné push služby prohlížečů (jinak by server posílal požadavky na libovolnou adresu)
  const PUSH_HOST = /^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|[a-z0-9.-]*push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;
  if (typeof endpoint !== 'string' || !PUSH_HOST.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) {
    return NextResponse.json({ error: 'Neplatné předplatné.' }, { status: 400 });
  }

  // Zařízení patří poslednímu přihlášenému uživateli (sdílený telefon po odhlášení/přihlášení jiného účtu)
  await getSql()`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${userId}, ${endpoint}, ${p256dh}, ${auth})
    ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`;
  // nejvýš 5 zařízení na uživatele (nejstarší se odstraní)
  await getSql()`
    DELETE FROM push_subscriptions WHERE user_id = ${userId} AND id NOT IN (
      SELECT id FROM push_subscriptions WHERE user_id = ${userId} ORDER BY id DESC LIMIT 5)`;
  return NextResponse.json({ ok: true });
}
