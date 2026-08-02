import fs from 'node:fs';
import path from 'node:path';

/**
 * Bibliothèque de documents (PDF) — copiés depuis le dépôt adventools
 * (branche data/docs). Les fichiers sont servis statiquement depuis
 * /docs/… (public/docs) et listés ici pour la page « Bibliothèque »,
 * le lecteur PDF et le mode présentation.
 */

const DOCS_DIR = path.join(process.cwd(), 'public', 'docs');

export interface DocCategory {
  /** Nom du dossier (slug) */
  id: string;
  /** Nombre de documents */
  count: number;
  /** Taille totale en octets */
  size: number;
}

export interface DocItem {
  /** Chemin relatif dans /docs/ (ex : esprit_prophetie_fr/Education.PDF) */
  path: string;
  /** URL publique (encodée) */
  url: string;
  /** Nom du fichier sans extension */
  title: string;
  /** Catégorie (dossier parent) */
  category: string;
  /** Taille en octets */
  size: number;
}

// --- Cache mémoire (invalidé par mtime du dossier racine) ------------------
let _cache: { mtime: number; categories: DocCategory[]; docs: DocItem[] } | null = null;

function scan(): { categories: DocCategory[]; docs: DocItem[] } {
  try {
    const stat = fs.statSync(DOCS_DIR);
    if (_cache && stat.mtimeMs === _cache.mtime) {
      return { categories: _cache.categories, docs: _cache.docs };
    }
  } catch {
    _cache = null;
    return { categories: [], docs: [] };
  }

  const docs: DocItem[] = [];
  const byCat = new Map<string, { count: number; size: number }>();

  const walk = (dir: string, rel: string) => {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const relPath = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        walk(full, relPath);
      } else if (/\.pdf$/i.test(e.name)) {
        let size = 0;
        try {
          size = fs.statSync(full).size;
        } catch {
          /* ignore */
        }
        const cat = rel.split('/')[0] ?? 'divers';
        const rec = byCat.get(cat) ?? { count: 0, size: 0 };
        rec.count++;
        rec.size += size;
        byCat.set(cat, rec);
        docs.push({
          path: relPath,
          url: `/docs/${relPath.split('/').map(encodeURIComponent).join('/')}`,
          title: e.name.replace(/\.pdf$/i, '').replace(/_/g, ' ').trim(),
          category: cat,
          size,
        });
      }
    }
  };
  walk(DOCS_DIR, '');

  docs.sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }));
  const categories: DocCategory[] = [...byCat.entries()]
    .map(([id, v]) => ({ id, count: v.count, size: v.size }))
    .sort((a, b) => b.count - a.count);

  try {
    const stat = fs.statSync(DOCS_DIR);
    _cache = { mtime: stat.mtimeMs, categories, docs };
  } catch {
    /* ignore */
  }
  return { categories, docs };
}

/** Liste des catégories (dossiers) */
export function getDocCategories(): DocCategory[] {
  return scan().categories;
}

/** Tous les documents PDF de la bibliothèque */
export function getDocs(): DocItem[] {
  return scan().docs;
}

/** Recherche plein-texte dans les titres */
export function searchDocs(query: string): DocItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return getDocs();
  return getDocs().filter(
    (d) =>
      d.title.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.path.toLowerCase().includes(q)
  );
}

/** Un document par chemin relatif (lecteur + présentation) */
export function getDocByPath(relPath: string): DocItem | null {
  let target = relPath.replace(/^\/?docs\//i, '');
  // Astro décode déjà les segments d'URL ; un decodeURIComponent ici lèverait
  // une URIError sur les noms contenant un « % » littéral. On ne décode donc
  // que si le chemin n'existe pas tel quel (liens partagés encodés).
  const direct = getDocs().find((d) => d.path === target);
  if (direct) return direct;
  try {
    target = decodeURIComponent(target);
  } catch {
    return null;
  }
  return getDocs().find((d) => d.path === target) ?? null;
}

/** Formats lisible d'une taille en octets */
export function formatSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${bytes} o`;
}
