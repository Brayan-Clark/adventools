/**
 * Helpers de rendu côté client (navigateur) pour l'application statique.
 *
 * GitHub Pages sert des fichiers statiques : les données viennent de Supabase
 * au moment du rendu dans le navigateur. Ce module fournit les fonctions de
 * rendu HTML réutilisables par les pages Astro (dans leurs balises <script>).
 */
import { t, pickTitle, pickDescription, TYPE_LABELS } from './i18n';
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

const ICONS: Record<string, string> = {
  sermon: 'M15 10l4.55-2.28A1 1 0 0121 8.6v6.8a1 1 0 01-1.45.88L15 14v-4z',
  course: 'M12 3l9 5-9 5-9-5 9-5zm-7 8.5v4.5c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-4.5L12 13l-7-1.5z',
  audio: 'M9 18V6l12-3v12M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-3a3 3 0 11-6 0 3 3 0 016 0z',
  seminar: 'M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2c0-.56-.12-1.1-.33-1.58M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2c0-.56.12-1.1.33-1.58m0 0a5 5 0 019.34 0M15 6a3 3 0 11-6 0 3 3 0 016 0z',
  conference: 'M8 5v14l11-7L8 5zm8 1a2 2 0 110-4 2 2 0 010 4zM5 7a3 3 0 013 3v8a3 3 0 01-6 0v-8a3 3 0 013-3z',
  article: 'M4 4h16v2H4V4zm0 4h16v2H4V8zm0 4h10v2H4v-2zm0 4h16v2H4v-2z',
};

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

export function mediaCardHtml(item: MediaItem, lang: Lang): string {
  const title = pickTitle(item, lang);
  const desc = pickDescription(item, lang);
  const typeLabel = t(lang, TYPE_LABELS[item.type]);
  const base = import.meta.env.BASE_URL ?? '/';
  const href = `${base.replace(/\/$/, '')}${typePath(item.type)}/${item.slug}`;
  const icon = ICONS[item.type] ?? ICONS.sermon;
  const lessonsCount = item.lessons?.length ?? 0;
  const readingMin = item.content_fr ? Math.max(1, Math.round(item.content_fr.split(/\s+/).length / 200)) : 0;

  return `<article class="card-hover group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-night-700/60 dark:bg-night-800/70">
  <a href="${href}" class="block" aria-label="${title}">
    <div class="relative aspect-video overflow-hidden">
      <img src="${item.image || '/favicon.svg'}" alt="" loading="lazy"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
      <span class="chip absolute left-3 top-3 shadow-lg ${TYPE_STYLES[item.type] ?? TYPE_STYLES.sermon}">
        <svg class="mr-1 h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="${icon}" /></svg>
        ${typeLabel}
      </span>
      ${item.duration ? `<span class="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">${item.duration}</span>` : ''}
      <span class="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/90 text-night-950 opacity-0 shadow-soft-gold transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-75">
        ${item.type === 'article'
          ? '<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v2H4V4zm0 4h16v2H4V8zm0 4h10v2H4v-2zm0 4h16v2H4v-2z" /></svg>'
          : '<svg class="ml-0.5 h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z" /></svg>'}
      </span>
    </div>
    <div class="p-4">
      <h3 class="line-clamp-2 font-display text-base font-semibold leading-snug text-slate-900 transition group-hover:text-gold-600 dark:text-white dark:group-hover:text-gold-400">${title}</h3>
      ${item.type !== 'course' ? `<p class="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">${desc}</p>` : ''}
      <div class="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span class="flex items-center gap-1.5 truncate">
          <svg class="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-3.31 0-8 1.67-8 5v1h16v-1c0-3.33-4.69-5-8-5z" /></svg>
          <span class="truncate">${item.speaker || 'Andeaha Hizaha'}</span>
        </span>
        <span class="flex shrink-0 items-center gap-1.5">
          <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12a4.5 4.5 0 110-9 4.5 4.5 0 010 9zm0-7a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" /></svg>
          ${formatViews(item.views ?? 0)} ${t(lang, 'views')}
        </span>
      </div>
      ${(item.type === 'course' || item.type === 'conference') && lessonsCount > 0 ? `
        <div class="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zm1 2v10h12V7H6zm2 2h8v2H8V9zm0 4h5v2H8v-2z" /></svg>
          ${lessonsCount} ${t(lang, item.type === 'conference' ? 'sessions' : 'lessons')}
        </div>` : ''}
      ${item.type === 'article' && readingMin > 0 ? `
        <div class="mt-2 flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400">
          <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2z" /></svg>
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
    <svg class="h-6 w-6 text-gold-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2z" /></svg>
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
