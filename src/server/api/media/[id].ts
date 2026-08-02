import type { APIRoute } from 'astro';
import { getMediaById, updateMedia, deleteMedia } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  if (!isAdminRequest(request.headers.get('authorization'))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  const id = Number(params.id);
  if (!id) return new Response('bad id', { status: 400 });
  try {
    const data = await request.json();
    const ok = updateMedia(id, {
      type: data.type,
      slug: data.slug,
      title_fr: data.title_fr,
      title_mg: data.title_mg,
      description_fr: data.description_fr,
      description_mg: data.description_mg,
      content_fr: data.content_fr,
      content_mg: data.content_mg,
      speaker: data.speaker,
      image: data.image,
      video_url: data.video_url,
      audio_url: data.audio_url,
      duration: data.duration,
      date: data.date,
      category_id: data.category_id ? Number(data.category_id) : null,
      tags: Array.isArray(data.tags) ? data.tags : [],
      featured: !!data.featured,
      lessons: Array.isArray(data.lessons) ? data.lessons : [],
    });
    if (!ok) return new Response(JSON.stringify({ error: 'introuvable' }), { status: 404 });
    return new Response(JSON.stringify(getMediaById(id)), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  if (!isAdminRequest(request.headers.get('authorization'))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  const id = Number(params.id);
  if (!id) return new Response('bad id', { status: 400 });
  const ok = deleteMedia(id);
  if (!ok) return new Response(JSON.stringify({ error: 'introuvable' }), { status: 404 });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};
