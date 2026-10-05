import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

// Ikona appky (PWA, notifikace, plocha iPhonu) – vždy PNG.
export async function GET(req: NextRequest) {
  const requested = Number(req.nextUrl.searchParams.get('size'));
  const size = [96, 180, 192, 512].includes(requested) ? requested : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#22c55e',
          fontSize: size * 0.46,
          fontWeight: 800,
          letterSpacing: -size * 0.02,
          fontFamily: 'sans-serif',
        }}
      >
        PL
      </div>
    ),
    { width: size, height: size },
  );
}
