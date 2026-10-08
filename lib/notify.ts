import { getSql } from '@/lib/db';
import { sendToUser } from '@/lib/push';
import { shortName } from '@/lib/teams';

// Zápis do notifications_sent se děje PŘED odesláním (INSERT … ON CONFLICT DO NOTHING RETURNING):
// dva souběžné běhy tak nikdy nepošlou totéž dvakrát.

/** Připomínka: zápas začíná do hodiny a uživatel nemá tip. Jedno upozornění na uživatele a běh. */
export async function sendReminders(dryRun = false) {
  const sql = getSql();
  const eligible = sql`
    SELECT u.id AS user_id, m.id AS match_id
    FROM matches m CROSS JOIN users u
    WHERE m.featured AND m.status IN ('scheduled', 'upcoming')
      AND m.kickoff > NOW()
      AND m.kickoff <= NOW() + INTERVAL '60 minutes'
      AND u.notify_reminders
      AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM tips t WHERE t.user_id = u.id AND t.match_id = m.id)
      AND NOT EXISTS (SELECT 1 FROM notifications_sent n WHERE n.kind = 'reminder' AND n.user_id = u.id AND n.match_id = m.id)`;

  if (dryRun) {
    const rows = await eligible;
    return { dryRun: true, users: new Set(rows.map(r => r.user_id)).size, pairs: rows.length };
  }

  const claimed = await sql`
    INSERT INTO notifications_sent (kind, user_id, match_id)
    SELECT 'reminder', e.user_id, e.match_id FROM (
      SELECT u.id AS user_id, m.id AS match_id
      FROM matches m CROSS JOIN users u
      WHERE m.featured AND m.status IN ('scheduled', 'upcoming')
        AND m.kickoff > NOW()
        AND m.kickoff <= NOW() + INTERVAL '60 minutes'
        AND u.notify_reminders
        AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM tips t WHERE t.user_id = u.id AND t.match_id = m.id)
    ) e
    ON CONFLICT DO NOTHING
    RETURNING user_id, match_id`;
  if (!claimed.length) return { users: 0, pairs: 0, delivered: 0 };

  const matchIds = [...new Set(claimed.map(c => c.match_id as number))];
  const matches = await sql`SELECT id, home_team, away_team, kickoff FROM matches WHERE id = ANY(${matchIds}) ORDER BY kickoff`;
  const byId = new Map(matches.map(m => [m.id as number, m]));

  const perUser = new Map<number, number[]>();
  for (const c of claimed) perUser.set(c.user_id, [...(perUser.get(c.user_id) ?? []), c.match_id]);

  let delivered = 0;
  for (const [userId, ids] of perUser) {
    const list = ids.map(id => byId.get(id)!).sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff));
    const first = list[0];
    const mins = Math.max(1, Math.round((+new Date(first.kickoff) - Date.now()) / 60000));
    const label = `${shortName(first.home_team)} – ${shortName(first.away_team)}`;
    const body = list.length === 1
      ? `${label} začíná za ${mins} min a ty ještě nemáš natipováno.`
      : `Máš nenatipováno ${list.length} zápasů, nejbližší ${label} začíná za ${mins} min.`;
    delivered += await sendToUser(userId, { title: '⏰ Natipuj, než bude pozdě', body, url: '/', tag: 'reminder' });
  }
  return { users: perUser.size, pairs: claimed.length, delivered };
}

/** Výsledek: zápas skončil a uživatel tipoval. Volá se po dopočtení bodů. */
export async function sendResults(matchIds: number[]) {
  if (!matchIds.length) return { users: 0, delivered: 0 };
  const sql = getSql();
  const claimed = await sql`
    INSERT INTO notifications_sent (kind, user_id, match_id)
    SELECT 'result', t.user_id, t.match_id
    FROM tips t JOIN users u ON u.id = t.user_id
    WHERE t.match_id = ANY(${matchIds})
      AND t.points IS NOT NULL
      AND u.notify_results
      AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = t.user_id)
    ON CONFLICT DO NOTHING
    RETURNING user_id, match_id`;
  if (!claimed.length) return { users: 0, delivered: 0 };

  const rows = await sql`
    SELECT t.user_id, t.match_id, t.home_tip, t.away_tip, t.points, t.scorer_points,
           m.home_team, m.away_team, m.home_score, m.away_score
    FROM tips t JOIN matches m ON m.id = t.match_id
    WHERE t.match_id = ANY(${matchIds})`;
  const claimedKeys = new Set(claimed.map(c => `${c.user_id}:${c.match_id}`));

  let delivered = 0, users = 0;
  for (const r of rows) {
    if (!claimedKeys.has(`${r.user_id}:${r.match_id}`)) continue;
    const total = (r.points ?? 0) + (r.scorer_points ?? 0);
    const extra = r.points === 10 ? ' 🎯 přesný tip!' : '';
    delivered += await sendToUser(r.user_id, {
      title: `${shortName(r.home_team)} ${r.home_score}:${r.away_score} ${shortName(r.away_team)}`,
      body: `Tvůj tip ${r.home_tip}:${r.away_tip} → ${total} b${extra}`,
      url: '/',
      tag: `result-${r.match_id}`,
    });
    users++;
  }
  return { users, delivered };
}
