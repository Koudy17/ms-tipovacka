'use client';

import { useCallback, useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(padded);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

type Status = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

export default function NotificationSettings({ dark, onClose }: { dark: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<Status>('loading');
  const [prefs, setPrefs] = useState({ reminders: true, results: true });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const detect = useCallback(async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus(isIOS && !standalone ? 'ios-install' : 'unsupported');
      return;
    }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    const sub = await reg.pushManager.getSubscription();
    setStatus(sub && Notification.permission === 'granted' ? 'on' : 'off');
    const res = await fetch('/api/push/prefs');
    if (res.ok) setPrefs(await res.json());
  }, []);

  useEffect(() => { detect().catch(() => setStatus('unsupported')); }, [detect]);

  const enable = async () => {
    setBusy(true); setMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setStatus(permission === 'denied' ? 'denied' : 'off'); return; }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Uložení se nepovedlo.');
      setStatus('on');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Zapnutí se nepovedlo.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true); setMessage('');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('off');
    } finally {
      setBusy(false);
    }
  };

  const setPref = async (key: 'reminders' | 'results', value: boolean) => {
    setPrefs(p => ({ ...p, [key]: value }));
    await fetch('/api/push/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
  };

  const sendTest = async () => {
    setBusy(true); setMessage('');
    const res = await fetch('/api/push/test', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? 'Zkušební upozornění odesláno.' : (data.error ?? 'Odeslání se nepovedlo.'));
    setBusy(false);
  };

  const d = {
    bg: dark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900',
    sub: dark ? 'text-slate-400' : 'text-gray-500',
    border: dark ? 'border-slate-700' : 'border-gray-200',
    btn: 'w-full rounded-lg py-2 text-sm font-semibold transition disabled:opacity-50',
  };

  const Toggle = ({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) => (
    <label className={`flex items-center justify-between gap-3 py-3 border-t ${d.border} cursor-pointer`}>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className={`block text-xs ${d.sub}`}>{hint}</span>
      </span>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="h-5 w-5 accent-green-500" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 ${d.bg}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">🔔 Upozornění</h2>
          <button onClick={onClose} className={`text-2xl leading-none ${d.sub} hover:text-red-400`} aria-label="Zavřít">×</button>
        </div>

        {status === 'loading' && <p className={`text-sm ${d.sub}`}>Načítám…</p>}

        {status === 'unsupported' && (
          <p className={`text-sm ${d.sub}`}>Tenhle prohlížeč upozornění nepodporuje. Zkus Chrome, Firefox nebo Safari na novějším telefonu či počítači.</p>
        )}

        {status === 'ios-install' && (
          <div className={`text-sm ${d.sub} space-y-2`}>
            <p>Na iPhonu fungují upozornění jen z appky přidané na plochu:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>V Safari klepni na tlačítko Sdílet (čtvereček se šipkou).</li>
              <li>Zvol „Přidat na plochu“.</li>
              <li>Otevři Emeho tipovačku z plochy a zapni upozornění tady.</li>
            </ol>
            <p className="text-xs">Vyžaduje iOS 16.4 nebo novější.</p>
          </div>
        )}

        {status === 'denied' && (
          <p className={`text-sm ${d.sub}`}>Upozornění jsou v prohlížeči zablokovaná. Povol je v nastavení webu (ikona zámku vedle adresy) a načti stránku znovu.</p>
        )}

        {status === 'off' && (
          <div className="space-y-2">
            <p className={`text-sm ${d.sub}`}>Dostaneš připomínku, když ti hodinu před zápasem chybí tip, a hned po zápase své body.</p>
            <button onClick={enable} disabled={busy} className={`${d.btn} bg-green-600 hover:bg-green-500 text-white`}>
              {busy ? '⏳ …' : 'Zapnout upozornění'}
            </button>
          </div>
        )}

        {status === 'on' && (
          <div>
            <p className="text-sm text-green-500 mb-1">✓ Upozornění jsou na tomhle zařízení zapnutá.</p>
            <Toggle label="Připomínka před zápasem" hint="Hodinu před výkopem, když nemáš natipováno" value={prefs.reminders} onChange={v => setPref('reminders', v)} />
            <Toggle label="Výsledek mého tipu" hint="Po skončení zápasu s body, které jsi získal" value={prefs.results} onChange={v => setPref('results', v)} />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={sendTest} disabled={busy} className={`${d.btn} border ${d.border}`}>Zkušební upozornění</button>
              <button onClick={disable} disabled={busy} className={`${d.btn} border ${d.border} ${d.sub}`}>Vypnout</button>
            </div>
          </div>
        )}

        {message && <p className="text-sm text-amber-500 mt-3">{message}</p>}
      </div>
    </div>
  );
}
