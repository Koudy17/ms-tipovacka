import webpush from 'web-push';
import { getSql } from '@/lib/db';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com', pub, priv);
  configured = true;
  return true;
}

// Pošle upozornění na všechna zařízení jednoho uživatele. Neplatná předplatná (404/410) smaže.
// Vrací počet doručených (přijatých push službou).
export async function sendToUser(userId: number, payload: PushPayload): Promise<number> {
  if (!configure()) {
    console.error('[push] chybí VAPID klíče');
    return 0;
  }
  const sql = getSql();
  const subs = await sql`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}`;
  let ok = 0;
  await Promise.all(subs.map(async s => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 }, // zastaralé upozornění (např. před zápasem) nemá smysl doručovat po hodině
      );
      ok++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await sql`DELETE FROM push_subscriptions WHERE id = ${s.id}`;
      } else {
        console.error('[push] odeslání selhalo', status ?? e);
      }
    }
  }));
  return ok;
}
