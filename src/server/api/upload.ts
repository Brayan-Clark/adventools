import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { isAdminRequest } from '@/lib/admin';

export const prerender = false;

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_SIZE = 1024 * 1024 * 500; // 500 Mo

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request.headers.get('authorization'))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.size) {
      return new Response(JSON.stringify({ error: 'fichier manquant' }), { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'fichier trop volumineux (max 500 Mo)' }), { status: 413 });
    }
    // SVG retiré : vecteur XSS potentiel (scripts exécutés en navigation directe)
    const allowed = /\.(mp4|webm|ogg|mov|m4v|mp3|wav|m4a|jpg|jpeg|png|webp|gif)$/i;
    if (!allowed.test(file.name)) {
      return new Response(JSON.stringify({ error: 'type de fichier non autorisé' }), { status: 415 });
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const ext = path.extname(file.name).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);

    return new Response(JSON.stringify({ url: `/uploads/${name}`, name }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
};
