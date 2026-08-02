import type { APIRoute } from 'astro';
import { incrementViews } from '@/lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!id) return new Response('bad id', { status: 400 });
  incrementViews(id);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
