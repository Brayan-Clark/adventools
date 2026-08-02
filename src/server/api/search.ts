import type { APIRoute } from 'astro';
import { searchMedia } from '@/lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  const type = url.searchParams.get('type') ?? undefined;
  const results = q ? searchMedia(q, type as any) : [];
  return new Response(JSON.stringify({ q, results }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
