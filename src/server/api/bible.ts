import type { APIRoute } from 'astro';
import { getBibleVersions, getBibleBooks, getBibleChapter, parseBibleReference, searchBible } from '@/lib/bible';

export const GET: APIRoute = ({ url }) => {
  const action = url.searchParams.get('action') ?? 'chapter';
  const version = url.searchParams.get('version') ?? '';

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  if (action === 'versions') {
    return json({ versions: getBibleVersions() });
  }

  if (action === 'books') {
    return json({ version, books: getBibleBooks(version) });
  }

  // Référence rapide : « Jao.3:16 », « Genèse 1:1 », « Jao.3:16-20 »…
  if (action === 'ref') {
    const q = url.searchParams.get('q') ?? '';
    const ref = parseBibleReference(version, q);
    if (!ref) {
      return json({ found: false, query: q }, 404);
    }
    return json({ found: true, ref });
  }

  // Recherche plein-texte (mots-clés / phrases)
  if (action === 'search') {
    const q = url.searchParams.get('q') ?? '';
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '30') || 30, 60);
    const { count, results } = searchBible(version, q, limit);
    return json({ query: q, count, results });
  }

  // action === 'chapter'
  const book = Number(url.searchParams.get('book') ?? '0');
  const chapter = Number(url.searchParams.get('chapter') ?? '0');
  const data = getBibleChapter(version, book, chapter);
  if (!data) {
    return json({ error: 'Chapitre introuvable' }, 404);
  }
  return json(data);
};
