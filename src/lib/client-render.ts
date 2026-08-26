/**
 * Helpers de rendu côté client (navigateur) pour l'application statique.
 *
 * GitHub Pages sert des fichiers statiques : les données viennent de Supabase
 * au moment du rendu dans le navigateur. Ce module fournit les fonctions de
 * rendu HTML réutilisables par les pages Astro (dans leurs balises <script>).
 */
import { t, pickTitle, pickDescription, TYPE_LABELS } from './i18n';
import { ICONS as ICON_SET, MEDIA_ICONS } from './icons';
import type { Lang, MediaItem } from './types';

// --- Langue côté client -----------------------------------------------------

/** Résout la langue active dans le navigateur (URL ?lang= puis localStorage). */
export function clientLang(): Lang {
  const p = new URLSearchParams(window.location.search).get('lang');
  if (p === 'mg' || p === 'fr') return p;
  try {
    const c = localStorage.getItem('ah-lang');
    if (c === 'mg' || c === 'fr') return c;
  } catch {
    /* ignore */
  }
  return 'fr';
}

export function setClientLang(lang: Lang) {
  try {
    localStorage.setItem('ah-lang', lang);
  } catch {
    /* ignore */
  }
}

/** Construit une URL interne en tenant compte du base path GitHub Pages. */
export function pathTo(p: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.replace(/\/$/, '')}${p.startsWith('/') ? p : '/' + p}`;
}

// --- Résilience du back-end -------------------------------------------------

/**
 * Exécute une promesse en distinguant « aucun résultat » de « la source n'a
 * pas répondu ». Sans cette distinction, une base injoignable et une liste
 * vide produisaient le même écran (« Aucun résultat trouvé »), ce qui donnait
 * l'impression que les données avaient disparu.
 */
export async function settle<T>(p: Promise<T>, fallback: T): Promise<{ data: T; failed: boolean }> {
  try {
    return { data: await p, failed: false };
  } catch {
    return { data: fallback, failed: true };
  }
}

/** Bandeau d'indisponibilité, avec bouton de rechargement. */
export function backendDownHtml(lang: Lang): string {
  return `
  <div class="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-center">
    <p class="font-display text-base font-semibold text-amber-700 dark:text-amber-300">⚠️ ${t(lang, 'backend_down_title')}</p>
    <p class="mx-auto mt-1 max-w-xl text-sm text-amber-700/80 dark:text-amber-200/80">${t(lang, 'backend_down_text')}</p>
    <button data-backend-retry class="btn-ghost mt-4 px-4 py-2 text-xs">${t(lang, 'backend_retry')}</button>
  </div>`;
}

/** Branche le bouton « Réessayer » du bandeau sur un rechargement des données. */
export function wireBackendRetry(root: ParentNode, retry: () => void): void {
  root.querySelectorAll('[data-backend-retry]').forEach((b) => b.addEventListener('click', retry));
}

// --- Formatage --------------------------------------------------------------

export function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

export function formatDate(iso?: string, lang: Lang = 'fr'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'mg' ? 'mg-MG' : 'fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// --- Rendu MediaCard --------------------------------------------------------

const TYPE_STYLES: Record<string, string> = {
  sermon: 'bg-indigo-500/90 text-white',
  course: 'bg-emerald-500/90 text-white',
  audio: 'bg-amber-500/90 text-white',
  seminar: 'bg-rose-500/90 text-white',
  conference: 'bg-violet-500/90 text-white',
  article: 'bg-sky-500/90 text-white',
};

const ICONS = MEDIA_ICONS;

export function typePath(type: string): string {
  switch (type) {
    case 'sermon': return '/sermons';
    case 'course': return '/cours';
    case 'audio': return '/audio';
    case 'seminar': return '/seminaires';
    case 'conference': return '/conferences';
    case 'article': return '/articles';
    default: return '/';
  }
}

/** Échappement HTML : le contenu vient de la base, pas du code. */
function esc(s: unknown): string {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}

export function mediaCardHtml(item: MediaItem, lang: Lang): string {
  const title = pickTitle(item, lang);
  const desc = pickDescription(item, lang);
  const typeLabel = t(lang, TYPE_LABELS[item.type]);
  const base = import.meta.env.BASE_URL ?? '/';
  const href = `${base.replace(/\/$/, '')}${typePath(item.type)}/${item.slug}`;
  const icon = ICONS[item.type] ?? ICONS.sermon;
  const lessonsCount = item.lessons?.length ?? 0;
  const readingMin = item.content_fr ? Math.max(1, Math.round(item.content_fr.split(/\s+/).length / 200)) : 0;

  // Sans visuel, un dégradé plutôt qu'une image cassée : le repli pointait sur
  // `/favicon.svg` sans base path, donc 404 sur GitHub Pages.
  const media = item.image
    ? `<img src="${esc(item.image)}" alt="" loading="lazy"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />`
    : `<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-night-800 to-night-900">
        <svg class="h-10 w-10 text-white/25" fill="currentColor" viewBox="0 0 24 24"><path d="${icon}" /></svg>
      </div>`;

  return `<article class="card-hover group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-night-700/60 dark:bg-night-800/70">
  <a href="${href}" class="block" aria-label="${esc(title)}">
    <div class="relative aspect-video overflow-hidden">
      ${media}
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
      <span class="chip absolute left-3 top-3 shadow-lg ${TYPE_STYLES[item.type] ?? TYPE_STYLES.sermon}">
        <svg class="mr-1 h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="${icon}" /></svg>
        ${typeLabel}
      </span>
      ${item.duration ? `<span class="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">${esc(item.duration)}</span>` : ''}
      <span class="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/90 text-night-950 opacity-0 shadow-soft-gold transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-75">
        ${item.type === 'article'
          ? `<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="${ICON_SET.article}" /></svg>`
          : `<svg class="ml-0.5 h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="${ICON_SET.play}" /></svg>`}
      </span>
    </div>
    <div class="p-4">
      <h3 class="line-clamp-2 font-display text-base font-semibold leading-snug text-slate-900 transition group-hover:text-gold-600 dark:text-white dark:group-hover:text-gold-400">${esc(title)}</h3>
      ${item.type !== 'course' ? `<p class="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">${esc(desc)}</p>` : ''}
      <div class="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span class="flex items-center gap-1.5 truncate">
          <svg class="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="${ICON_SET.person}" /></svg>
          <span class="truncate">${esc(item.speaker || 'Andeaha Hizaha')}</span>
        </span>
        <span class="flex shrink-0 items-center gap-1.5">
          <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="${ICON_SET.eye}" /></svg>
          ${formatViews(item.views ?? 0)} ${t(lang, 'views')}
        </span>
      </div>
      ${(item.type === 'course' || item.type === 'conference') && lessonsCount > 0 ? `
        <div class="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="${ICON_SET.list}" /></svg>
          ${lessonsCount} ${t(lang, item.type === 'conference' ? 'sessions' : 'lessons')}
        </div>` : ''}
      ${item.type === 'article' && readingMin > 0 ? `
        <div class="mt-2 flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400">
          <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="${ICON_SET.sparkles}" /></svg>
          ${readingMin} ${t(lang, 'reading_time')}
        </div>` : ''}
    </div>
  </a>
</article>`;
}

// --- Rendu VerseCard ---------------------------------------------------------

export function verseCardHtml(verse: { text_fr?: string; text_mg?: string; reference?: string } | null, lang: Lang): string {
  if (!verse) return '';
  const text = lang === 'mg' && verse.text_mg ? verse.text_mg : verse.text_fr || '';
  return `
  <div class="relative overflow-hidden rounded-2xl border border-gold-500/30 bg-gradient-to-br from-night-900 to-night-950 p-6 shadow-soft">
    <div class="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gold-500/10 blur-2xl"></div>
    <svg class="h-6 w-6 text-gold-500" fill="currentColor" viewBox="0 0 24 24"><path d="${ICON_SET.sparkles}" /></svg>
    <p class="mt-2 font-display text-lg font-medium leading-relaxed text-white">« ${text} »</p>
    <p class="mt-3 text-sm font-semibold text-gold-400">${verse.reference || ''}</p>
  </div>`;
}

// --- Rendu cantique (détail) --------------------------------------------------

export function cantiqueDetailHtml(c: {
  title: string;
  num: number;
  key?: string;
  content?: string;
  source?: string;
}, lang: Lang): string {
  const strophes = (c.content || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  return `
  <div class="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8 dark:border-night-700/60 dark:bg-night-800/80">
    <div class="flex flex-wrap items-center gap-3">
      <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500 font-display text-lg font-bold text-night-950">${c.num}</span>
      <div class="min-w-0 flex-1">
        <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white">${c.title}</h1>
        ${c.key ? `<p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">${t(lang, 'cantique_key')} : ${c.key}</p>` : ''}
      </div>
    </div>
    ${strophes.length ? `<div class="mt-6 space-y-5">${strophes.map((s, i) => `<div class="cantique-strophe"><p class="text-center text-xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400">${t(lang, 'pres_stanza')} ${i + 1}</p><pre class="mt-2 whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">${s}</pre></div>`).join('')}</div>` : `<p class="mt-6 text-slate-500 dark:text-slate-400">${t(lang, 'cantique_no_lyrics')}</p>`}
    ${c.source ? `<p class="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-400 dark:border-night-700">${t(lang, 'source')} : ${c.source}</p>` : ''}
  </div>`;
}
