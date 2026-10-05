'use client';

import { useCallback, useEffect, useState } from 'react';

interface Status { enabled: boolean; hasEmail: boolean; verified: boolean; email?: string | null }

// 1) Zpracuje odkaz z e-mailu (/?verify=<token>)  2) Přihlášenému s nepotvrzeným e-mailem ukáže upozornění.
// Celé je to neviditelné, dokud není na serveru zapnuté EMAIL_VERIFICATION=on.
export default function EmailVerifyNotice() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/users/email-status');
      setStatus(res.ok ? await res.json() : null);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('verify');
    if (token) {
      window.history.replaceState(null, '', window.location.pathname); // token nenechávat v adrese
      fetch('/api/users/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then(async r => {
          const data = await r.json().catch(() => ({}));
          setMessage(r.ok ? { ok: true, text: '✓ E-mail potvrzen, díky!' } : { ok: false, text: data.error ?? 'Potvrzení se nepovedlo.' });
          loadStatus();
        })
        .catch(() => setMessage({ ok: false, text: 'Potvrzení se nepovedlo, zkus to znovu.' }));
    } else {
      loadStatus();
    }
    // po přihlášení / registraci / odhlášení znovu zjistit stav
    window.addEventListener('auth-changed', loadStatus);
    return () => window.removeEventListener('auth-changed', loadStatus);
  }, [loadStatus]);

  const resend = async () => {
    setBusy(true);
    const res = await fetch('/api/users/resend-verification', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? { ok: true, text: 'Poslali jsme ti nový odkaz, mrkni do schránky.' } : { ok: false, text: data.error ?? 'Odeslání se nepovedlo.' });
    setBusy(false);
  };

  const needsVerify = status?.enabled && status.hasEmail && !status.verified;
  if (!message && !needsVerify) return null;

  return (
    <div className={`px-4 py-2 text-sm flex items-center justify-center gap-3 flex-wrap ${message && !message.ok ? 'bg-red-600 text-white' : message?.ok ? 'bg-green-600 text-white' : 'bg-amber-500 text-black'}`}>
      <span>{message ? message.text : `Potvrď svůj e-mail (${status?.email ?? ''}) – poslali jsme ti odkaz.`}</span>
      {needsVerify && !(message?.ok) && (
        <button onClick={resend} disabled={busy} className="underline font-semibold disabled:opacity-60">
          {busy ? 'Posílám…' : 'Poslat znovu'}
        </button>
      )}
      {message && <button onClick={() => setMessage(null)} className="font-bold" aria-label="Zavřít">×</button>}
    </div>
  );
}
