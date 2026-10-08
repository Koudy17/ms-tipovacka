import { getSql } from '@/lib/db';

// Denní strop na odeslané e-maily: chrání limit Resendu (zdarma 100/den) a pověst odesílatele před zneužitím formulářů
const DAILY_CAP = Number(process.env.MAIL_DAILY_CAP ?? 90);

async function underDailyCap(): Promise<boolean> {
  try {
    const sql = getSql();
    await sql`CREATE TABLE IF NOT EXISTS email_log (sent_at TIMESTAMP NOT NULL DEFAULT NOW())`;
    const r = await sql`SELECT COUNT(*)::int AS n FROM email_log WHERE sent_at > NOW() - INTERVAL '24 hours'`;
    if (r[0].n >= DAILY_CAP) return false;
    await sql`INSERT INTO email_log DEFAULT VALUES`;
    await sql`DELETE FROM email_log WHERE sent_at < NOW() - INTERVAL '3 days'`;
    return true;
  } catch (e) {
    console.error('[mail] kontrola limitu selhala', e);
    return true; // výpadek počítadla nesmí zablokovat obnovu hesla
  }
}

// Odesílání e-mailů přes Resend (resend.com). Bez RESEND_API_KEY se e-mail jen vypíše do konzole serveru
// – pro lokální vývoj stačí zkopírovat odkaz z terminálu.
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[mail:dev] Komu: ${to}\n[mail:dev] Předmět: ${subject}\n${text}\n`);
    return process.env.NODE_ENV !== 'production';
  }
  if (!(await underDailyCap())) {
    console.error('[mail] denní strop e-mailů vyčerpán, zpráva se neodešle');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? 'Emeho tipovačka <onboarding@resend.dev>',
        to: [to],
        subject,
        text,
      }),
    });
    if (!res.ok) console.error('[mail] Resend HTTP', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error('[mail] odeslání selhalo', e);
    return false;
  }
}
