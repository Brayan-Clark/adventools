import type { APIRoute } from 'astro';
import { getCategories, getMedia, getVerseOfDay, getSettings, ensureDatabase } from '@/lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  ensureDatabase();
  const url = new URL(request.url);
  const type = url.searchParams.get('type') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? 200);

  const settings = getSettings();
  // Ne jamais exposer les clés sensibles (ex. admin_password) via l'API publique
  const { admin_password, ...publicSettings } = settings;

  const bundle = {
    categories: getCategories(),
    media: getMedia(type ? { type: type as any, limit } : { limit }),
    settings: publicSettings,
    verse: getVerseOfDay(),
    updated_at: new Date().toISOString(),
  };

  return new Response(JSON.stringify(bundle), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
