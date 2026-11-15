import { after } from 'next/server';
import { getSql } from '@/lib/db';
import { cached } from '@/lib/apiCache';
import { runSync } from '@/lib/syncFeatured';
import { sendReminders } from '@/lib/notify';

/**
 * Připomínky „nemáš natipováno“ bez externího plánovače: kdykoli někdo appku otevře a nějaký zápas
 * začíná za 60 minut nebo méně, pošle se (na pozadí, nejvýš jednou za 40 s) připomínka všem, komu tip chybí.
 * Dvojí odeslání nehrozí – sendReminders si každou dvojici hráč+zápas zapíše dřív, než ji pošle.
 */
export async function triggerReminders(): Promise<void> {
  try {
    const due = await getSql()`
      SELECT 1 FROM matches
      WHERE featured AND status IN ('scheduled', 'upcoming')
        AND kickoff > NOW() AND kickoff <= NOW() + INTERVAL '60 minutes'
      LIMIT 1`;
    if (!due.length) return;
    after(async () => {
      try {
        await cached('reminders', 40, async () => sendReminders());
      } catch (e) {
        console.error('[reminders]', e instanceof Error ? e.message : e);
      }
    });
  } catch (e) {
    console.error('[reminders] kontrola selhala', e);
  }
}

/**
 * Appka si zápasy synchronizuje sama, kdykoli ji někdo používá (živé sledování, otevření stránky).
 * Nezávisí tak na externím plánovači, který se nespouští spolehlivě.
 * Běží na pozadí po odeslání odpovědi (nic nebrzdí) a nejvýš jednou za 40 s (zámek v api_cache).
 */
export async function triggerAutoSync(): Promise<void> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return;
  try {
    // jen když existuje zápas, který běží, právě začíná, nebo skončil a ještě není vyhodnocený
    const due = await getSql()`
      SELECT 1 FROM matches
      WHERE featured AND status != 'finished'
        AND kickoff < NOW() + INTERVAL '5 minutes' AND kickoff > NOW() - INTERVAL '6 hours'
      LIMIT 1`;
    if (!due.length) return;
    after(async () => {
      try {
        await cached('autosync', 40, async () => (await runSync(key, { live: true, windowHours: 6 })));
      } catch (e) {
        console.error('[autosync]', e instanceof Error ? e.message : e);
      }
    });
  } catch (e) {
    console.error('[autosync] kontrola selhala', e);
  }
}
