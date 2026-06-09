import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0d1b2a',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* zelená linka nahoře */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '12px', backgroundColor: '#22c55e', display: 'flex' }} />
        {/* zelená linka dole */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12px', backgroundColor: '#22c55e', display: 'flex' }} />

        {/* míč emoji */}
        <div style={{ fontSize: '120px', marginBottom: '20px', display: 'flex' }}>⚽</div>

        {/* MS 2026 */}
        <div style={{ fontSize: '96px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '-2px', display: 'flex' }}>
          MS 2026
        </div>

        {/* TIPOVAČKA */}
        <div style={{ fontSize: '80px', fontWeight: 'bold', color: '#22c55e', letterSpacing: '4px', display: 'flex', marginTop: '-10px' }}>
          TIPOVAČKA
        </div>

        {/* popis */}
        <div style={{ fontSize: '28px', color: '#94a3b8', marginTop: '24px', display: 'flex' }}>
          Tipuj zápasy · Sbírej body · Poraž kamarády
        </div>

        {/* URL */}
        <div style={{
          marginTop: '40px',
          padding: '12px 32px',
          border: '2px solid #22c55e',
          borderRadius: '12px',
          fontSize: '22px',
          color: '#22d3ee',
          display: 'flex',
        }}>
          koudyho-tipovacka.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
