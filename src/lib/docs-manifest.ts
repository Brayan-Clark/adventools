/**
 * Chargement du manifest des documents PDF (branche `data` d'adventools) :
 * cache localStorage avec TTL 24h, utilisé par la page « Bibliothèque » ET le
 * studio de présentation (sélecteur de documents) — une seule source de vérité.
 *
 * Le manifest est organisé par dossiers : `categories` (id, titre, icône) et
 * `documents` (chaque PDF avec son categoryId). C'est cette organisation par
 * dossier que la présentation affiche désormais, comme la bibliothèque.
 */

export interface DocCat {
  id: string;
  title: string;
  icon?: string;
  color?: string;
  bg?: string;
}

export interface DocItem {
  id: string;
  title: string;
  fileName: string;
  categoryId: string;
  url: string;
  size: string;
  isAsset?: boolean;
  tags?: string[];
}

export const DOC_MANIFEST_URL =
  'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/docs/manifest.json';

const CACHE_KEY = 'docs-manifest-v1';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 h

interface DocsCache {
  docs: DocItem[];
  cats: DocCat[];
  ts: number;
}

function getDocsCache(): DocsCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as DocsCache;
    if (!Array.isArray(entry?.docs) || Date.now() - entry.ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function setDocsCache(docs: DocItem[], cats: DocCat[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ docs, cats, ts: Date.now() }));
  } catch {
    /* quota exceeded — silent */
  }
}

/**
 * Charge le manifest (cache d'abord, puis réseau).
 * Retourne `null` si le réseau est indisponible (le cache vide restera à null).
 */
export async function loadDocsManifest(): Promise<{ docs: DocItem[]; cats: DocCat[] } | null> {
  const cached = getDocsCache();
  if (cached) return { docs: cached.docs, cats: cached.cats };
  try {
    const res = await fetch(DOC_MANIFEST_URL);
    if (!res.ok) return null;
    const data = await res.json();
    const docs: DocItem[] = Array.isArray(data?.documents) ? data.documents : [];
    const cats: DocCat[] = Array.isArray(data?.categories) ? data.categories : [];
    setDocsCache(docs, cats);
    return { docs, cats };
  } catch {
    return null;
  }
}

export function docsCatById(cats: DocCat[], id: string): DocCat | undefined {
  return cats.find((c) => c.id === id);
}

/** Icône emoji d'une catégorie de documents (dossier). */
export function docsCatIcon(cat: DocCat | undefined): string {
  switch (cat?.icon) {
    case 'BookOpen':
      return '📖';
    case 'FileText':
      return '📄';
    case 'Users':
      return '👥';
    case 'Heart':
      return '💖';
    case 'Clock':
      return '⏰';
    case 'Music':
      return '🎵';
    case 'Globe':
      return '🌍';
    case 'Mic':
      return '🎙️';
    case 'FolderOpen':
    default:
      return '📁';
  }
}
