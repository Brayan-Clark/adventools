import type { APIRoute } from 'astro';
import { getDocCategories, getDocs, getDocByPath, formatSize, searchDocs } from '@/lib/documents';

export const GET: APIRoute = ({ url }) => {
  const action = url.searchParams.get('action') ?? 'list';
  const q = url.searchParams.get('q') ?? '';

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  if (action === 'categories') {
    return json({ categories: getDocCategories().map((c) => ({ ...c, sizeLabel: formatSize(c.size) })) });
  }

  // Recherche : ?q=… (sinon tout)
  if (action === 'search') {
    return json({ query: q, results: searchDocs(q).map((d) => ({ ...d, sizeLabel: formatSize(d.size) })) });
  }

  // Détail d'un document par chemin
  const path = url.searchParams.get('path') ?? '';
  if (path) {
    const doc = getDocByPath(path);
    if (!doc) return json({ error: 'Document introuvable' }, 404);
    return json({ ...doc, sizeLabel: formatSize(doc.size) });
  }

  return json({ categories: getDocCategories(), documents: getDocs().map((d) => ({ ...d, sizeLabel: formatSize(d.size) })) });
};
