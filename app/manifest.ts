import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Emeho tipovačka',
    short_name: 'Emeho tipovačka',
    description: 'Tipuj výsledky zápasů s přáteli.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    lang: 'cs',
    icons: [
      { src: '/api/icon?size=192', sizes: '192x192', type: 'image/png' },
      { src: '/api/icon?size=512', sizes: '512x512', type: 'image/png' },
      { src: '/api/icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
