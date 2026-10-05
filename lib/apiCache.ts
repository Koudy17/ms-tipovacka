import { getSql } from '@/lib/db';

// Mezipaměť odpovědí API-Football v DB: víc návštěvníků = pořád jen jeden dotaz na API za TTL.
let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await getSql()`
    CREATE TABLE IF NOT EXISTS api_cache (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`;
  ensured = true;
}

const inflight = new Map<string, Promise<unknown>>();

/**
 * Vrátí data z mezipaměti, pokud jsou mladší než ttlSec, jinak je stáhne (fetcher) a uloží.
 * Když stažení selže a existují starší data, vrátí raději ta (stale), než aby stránka spadla.
 */
export async function cached<T>(key: string, ttlSec: number, fetcher: () => Promise<T>): Promise<{ data: T; fetchedAt: Date; stale: boolean }> {
  await ensureTable();
  const sql = getSql();
  const rows = await sql`SELECT data, fetched_at, EXTRACT(EPOCH FROM (NOW() - fetched_at))::int AS age FROM api_cache WHERE key = ${key}`;
  const row = rows[0];
  if (row && row.age < ttlSec) return { data: row.data as T, fetchedAt: new Date(row.fetched_at + 'Z'), stale: false };

  // souběžné požadavky na stejný klíč v jedné instanci sloučit
  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fetcher().finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  try {
    const data = await p;
    await sql`
      INSERT INTO api_cache (key, data, fetched_at) VALUES (${key}, ${JSON.stringify(data)}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, fetched_at = NOW()`;
    return { data, fetchedAt: new Date(), stale: false };
  } catch (e) {
    if (row) return { data: row.data as T, fetchedAt: new Date(row.fetched_at + 'Z'), stale: true };
    throw e;
  }
}
