import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET() {
  const sql = getSql();
  const matches = await sql`SELECT * FROM matches ORDER BY kickoff ASC`;
  return NextResponse.json(matches);
}
