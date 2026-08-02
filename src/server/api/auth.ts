import type { APIRoute } from 'astro';
import { verifyPassword, issueToken, hashToken } from '@/lib/admin';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'json invalide' }), { status: 400 });
  }
  if (!body.password || !verifyPassword(body.password)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  const token = issueToken();
  return new Response(JSON.stringify({ token, tokenHash: hashToken(token) }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
