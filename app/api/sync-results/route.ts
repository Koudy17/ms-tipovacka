import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/adminAuth';
import { runSync } from '@/lib/syncFeatured';

export const maxDuration = 60;

// Synchronizuje JEN vybrané zápasy (featured), každý podle ID.
// mode=full (výchozí): všechny nedohrané + čerstvě dohrané bez střelců. Plánovač 1× denně + admin.
// mode=live: jen zápasy, které právě začínají nebo běží – bez takového zápasu nevolá API vůbec.
// Kromě tohoto koncového bodu se zápasy synchronizují i automaticky při používání appky (lib/autoSync.ts).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isCron && !checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Neautorizovano.' }, { status: 401 });
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Chybi API_FOOTBALL_KEY.' }, { status: 500 });

  try {
    const live = req.nextUrl.searchParams.get('mode') === 'live';
    return NextResponse.json(await runSync(apiKey, { live, forceSquads: req.nextUrl.searchParams.get('squads') === '1' }));
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 502 });
  }
}
