// Odesílání e-mailů přes Resend (resend.com). Bez RESEND_API_KEY se e-mail jen vypíše do konzole serveru
// – pro lokální vývoj stačí zkopírovat odkaz z terminálu.
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[mail:dev] Komu: ${to}\n[mail:dev] Předmět: ${subject}\n${text}\n`);
    return process.env.NODE_ENV !== 'production';
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
