import type { APIRoute } from 'astro';

/**
 * Proxy de streaming audio.
 *
 * Google Drive renvoie `Content-Disposition: attachment` sur les fichiers
 * partagés, ce qui force le navigateur à TÉLÉCHARGER au lieu de jouer dans
 * l'élément <audio>. Ce proxy récupère le flux avec `Content-Disposition:
 * inline` + `Content-Type: audio/mpeg` pour permettre la lecture directe.
 *
 * Sécurité : seuls les identifiants Google Drive sont acceptés (construits
 * côté serveur) ou une URL dont l'hôte figure dans l'allowlist — aucun fetch
 * arbitraire (anti-SSRF).
 *
 * Usage : /api/stream?id=<driveId> | /api/stream?url=<url allowlistée>
 */

// Hôtes autorisés pour le paramètre `url` (anti-SSRF)
const ALLOWED_HOSTS = [
  'drive.google.com',
  'drive.usercontent.google.com',
  'docs.google.com',
  'lh3.googleusercontent.com',
  'sdahymnals.com',
  'hymnals.net',
  'github.com',
  'raw.githubusercontent.com',
];

export const GET: APIRoute = async ({ url, request }) => {
  const target = url.searchParams.get('url');
  const driveId = url.searchParams.get('id');

  let upstream: string;
  if (driveId) {
    // URL Google Drive « propre » (sans page de confirmation)
    upstream = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=download&confirm=t`;
  } else if (target) {
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return new Response('URL invalide', { status: 400 });
    }
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return new Response('Hôte non autorisé', { status: 403 });
    }
    upstream = target;
  } else {
    return new Response('Paramètre url ou id manquant', { status: 400 });
  }

  // Range (seeking) : on transmet la requête de l'élément <audio>
  const range = request.headers.get('range');
  const headers: Record<string, string> = {};
  if (range) headers.Range = range;

  try {
    const res = await fetch(upstream, { headers, redirect: 'follow' });
    if (!res.ok && res.status !== 206) {
      return new Response('Source audio inaccessible', { status: 502 });
    }

    // Construit la réponse en forçant l'affichage inline (pas de download)
    const outHeaders = new Headers();
    const ct = res.headers.get('content-type');
    outHeaders.set('Content-Type', ct && ct.includes('audio') ? ct : 'audio/mpeg');
    outHeaders.set('Content-Disposition', 'inline');
    outHeaders.set('Accept-Ranges', 'bytes');
    outHeaders.set('Cache-Control', 'public, max-age=86400');
    if (res.headers.get('content-range')) {
      outHeaders.set('Content-Range', res.headers.get('content-range')!);
    }
    if (res.headers.get('content-length')) {
      outHeaders.set('Content-Length', res.headers.get('content-length')!);
    }

    return new Response(res.body, {
      status: res.status === 206 ? 206 : 200,
      headers: outHeaders,
    });
  } catch {
    return new Response('Erreur réseau vers la source audio', { status: 502 });
  }
};
