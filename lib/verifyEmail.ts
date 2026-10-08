import { createHash, randomBytes } from 'crypto';
import { getSql } from '@/lib/db';
import { sendMail } from '@/lib/mail';

const TOKEN_TTL_MS = 24 * 60 * 60_000; // odkaz platí 24 hodin
const MAX_PER_HOUR = 3;

// Ověřování e-mailů se zapíná až když funguje odesílání (doména + Resend): EMAIL_VERIFICATION=on
export const emailVerificationEnabled = () => process.env.EMAIL_VERIFICATION === 'on';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Pošle uživateli potvrzovací odkaz. Vrací false, když byl překročen limit nebo chybí adresa webu. */
export async function sendVerification(userId: number, email: string, devOrigin: string): Promise<boolean> {
  const sql = getSql();
  const recent = await sql`
    SELECT COUNT(*)::int AS n FROM email_verifications
    WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '1 hour'`;
  if (recent[0].n >= MAX_PER_HOUR) return false;

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV !== 'production' ? devOrigin : '');
  if (!base) {
    console.error('[verify] chybí NEXT_PUBLIC_SITE_URL, odkaz nelze sestavit');
    return false;
  }
  const token = randomBytes(32).toString('hex');
  await sql`
    INSERT INTO email_verifications (token_hash, user_id, email, expires_at)
    VALUES (${hashToken(token)}, ${userId}, ${email}, ${new Date(Date.now() + TOKEN_TTL_MS).toISOString()})`; // v DB jen hash
  return sendMail(
    email,
    'Emeho tipovačka – potvrď svůj e-mail',
    `Ahoj,\n\npotvrď prosím, že tenhle e-mail patří tobě (odkaz platí 24 hodin):\n\n${base}/?verify=${token}\n\n` +
      `Díky tomu ti půjde obnovit heslo a budeme ti moct posílat upozornění. Pokud ses neregistroval, tenhle e-mail ignoruj.`,
  );
}
