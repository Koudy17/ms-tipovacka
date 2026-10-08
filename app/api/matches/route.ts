import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET() {
  const sql = getSql();
  const matches = await sql`SELECT * FROM matches WHERE featured ORDER BY kickoff ASC`;
  // Veřejná data: CDN je drží 10 s, takže při náporu nejde každý požadavek do databáze
  return NextResponse.json(matches, { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' } });
}
