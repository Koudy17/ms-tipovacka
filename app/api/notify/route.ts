import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/adminAuth';
import { sendReminders } from '@/lib/notify';

// Plánovač (GitHub Actions) volá každých pár minut: pošle připomínky před zápasy.
// ?dry=1 jen spočítá, komu by upozornění šla (nic neodešle ani nezapíše).
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`;
  if (!isCron && !checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Neautorizovano.' }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get('dry') === '1';
  return NextResponse.json({ ok: true, reminders: await sendReminders(dry) });
}
