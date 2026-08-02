import type { APIRoute } from 'astro';
import { getMedia, createMedia, uniqueSlug } from '@/lib/db';
import { slugify } from '@/lib/i18n';
import { isAdminRequest } from '@/lib/admin';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const type = url.searchParams.get('type') ?? undefined;
  const featured = url.searchParams.get('featured') === '1';
  return new Response(
    JSON.stringify(getMedia(featured ? { type: type as any, featured: true } : { type: type as any })),
    { headers: { 'Content-Type': 'application/json' } }
  );
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request.headers.get('authorization'))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  try {
    const data = await request.json();
    if (!data.type || !data.title_fr) {
      return new Response(JSON.stringify({ error: 'type et titre requis' }), { status: 400 });
    }
    // Toujours garantir l'unicité du slug (même si l'admin en fournit un)
    const base = data.slug && data.slug.length > 2 ? data.slug : slugify(data.title_fr);
    const slug = uniqueSlug(base);
    const item = createMedia({
      type: data.type,
      slug,
      title_fr: data.title_fr,
      title_mg: data.title_mg || data.title_fr,
      description_fr: data.description_fr || '',
      description_mg: data.description_mg || '',
      content_fr: data.content_fr || '',
      content_mg: data.content_mg || '',
      speaker: data.speaker || '',
      image: data.image || '',
      video_url: data.video_url || '',
      audio_url: data.audio_url || '',
      duration: data.duration || '',
      date: data.date || new Date().toISOString().slice(0, 10),
      category_id: data.category_id ? Number(data.category_id) : null,
      tags: Array.isArray(data.tags) ? data.tags : String(data.tags || '').split(',').map((x: string) => x.trim()).filter(Boolean),
      featured: !!data.featured,
      lessons: Array.isArray(data.lessons) ? data.lessons : [],
    });
    return new Response(JSON.stringify(item), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
};
