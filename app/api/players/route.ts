import { NextRequest, NextResponse } from 'next/server';
import playersData from '@/data/players.json';

interface Player {
  team: string;
  name: string;
  position: string;
}

const players = playersData as Player[];

export async function GET(req: NextRequest) {
  const team = req.nextUrl.searchParams.get('team');
  if (!team) return NextResponse.json(players);
  const filtered = players.filter(p => p.team.toLowerCase() === team.toLowerCase());
  return NextResponse.json(filtered);
}
