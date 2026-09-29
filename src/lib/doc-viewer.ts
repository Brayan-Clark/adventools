/**
 * Lecteur de documents intégré (superposition plein écran).
 *
 * Pourquoi ce module existe : la branche `data` est servie par
 * raw.githubusercontent.com, qui renvoie **tous** les fichiers en
 * `application/octet-stream` avec `X-Content-Type-Options: nosniff`. Aucun
 * navigateur n'affichera un tel flux — ni en navigation directe, ni dans un
 * `<iframe>`, ni dans un `<embed>` : il propose systématiquement le
 * téléchargement. C'est exactement ce qu'on observait en cliquant sur un
 * document de la bibliothèque.
 *
 * La réponse porte en revanche `Access-Control-Allow-Origin: *` : on peut donc
 * récupérer les octets nous-mêmes et faire le rendu dans la page. Les PDF sont
 * dessinés avec pdf.js, le texte et le Markdown sont mis en forme ici.
 *
 * Les formats bureautiques (doc, docx, ppt…) ne sont pas rendus : ils
 * demanderaient un convertisseur bien plus lourd que l'application entière.
 * Le lecteur l'explique et propose le téléchargement.
 */

import { t } from './i18n';
import type { Lang } from './types';

export type DocKind = 'pdf' | 'markdown' | 'text' | 'office' | 'unknown';

/** Devine le type de document depuis son nom de fichier ou son URL. */
export function docKind(nameOrUrl: string): DocKind {
  const ext = (nameOrUrl.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'txt' || ext === 'text' || ext === 'log' || ext === 'csv') return 'text';
  if (['doc', 'docx', 'ppt', 'pptx', 'pptm', 'odp', 'odt', 'xls', 'xlsx'].includes(ext)) return 'office';
  return 'unknown';
}

const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );

// ── Rendu Markdown ─────────────────────────────────────────────────────────

/**
 * Sous-ensemble de Markdown suffisant pour des documents d'étude : titres,
 * gras, italique, code, citations, listes, liens, règles horizontales.
 * Le texte est échappé AVANT toute transformation : aucun HTML de la source
 * n'est interprété.
 */
export function renderMarkdown(src: string): string {
  const lines = esc(src).replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let inCode = false;
  let paragraph: string[] = [];

  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-200/60 px-1 py-0.5 text-[0.9em] dark:bg-night-700">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-gold-600 underline dark:text-gold-400">$1</a>'
      );

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p class="my-3 leading-relaxed">${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };

  for (const line of lines) {
    if (/^```/.test(line)) {
      flushParagraph();
      closeList();
      out.push(inCode ? '</code></pre>' : '<pre class="my-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100"><code>');
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(line + '\n');
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      const size = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'][level - 1];
      out.push(`<h${level} class="mt-6 mb-2 font-display ${size} font-bold">${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^\s*(?:---|\*\*\*|___)\s*$/.test(line)) {
      flushParagraph();
      closeList();
      out.push('<hr class="my-6 border-slate-200 dark:border-night-700" />');
      continue;
    }

    // Le texte est échappé en amont : un « > » de citation est déjà `&gt;`.
    const quote = line.match(/^\s*&gt;\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      out.push(`<blockquote class="my-3 border-l-4 border-gold-500/60 pl-4 italic text-slate-600 dark:text-slate-300">${inline(quote[1])}</blockquote>`);
      continue;
    }

    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushParagraph();
      const want = ul ? 'ul' : 'ol';
      if (inList !== want) {
        closeList();
        out.push(`<${want} class="my-3 ${want === 'ul' ? 'list-disc' : 'list-decimal'} space-y-1 pl-6">`);
        inList = want;
      }
      out.push(`<li>${inline((ul ?? ol)![1])}</li>`);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  if (inCode) out.push('</code></pre>');
  return out.join('');
}

// ── pdf.js ─────────────────────────────────────────────────────────────────

let pdfLibPromise: Promise<typeof import('pdfjs-dist')> | null = null;

async function pdfLib() {
  if (!pdfLibPromise) {
    pdfLibPromise = (async () => {
      const lib = await import('pdfjs-dist');
      // Le worker est chargé depuis le bundle : Vite en produit une URL stable.
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      lib.GlobalWorkerOptions.workerSrc = workerUrl;
      return lib;
    })();
  }
  return pdfLibPromise;
}

// ── Superposition ──────────────────────────────────────────────────────────

export interface DocViewerOptions {
  url: string;
  title: string;
  /** Nom de fichier, utilisé pour deviner le type quand l'URL ne suffit pas. */
  fileName?: string;
  lang?: Lang;
}

let activeCleanup: (() => void) | null = null;

/** Ferme le lecteur s'il est ouvert. */
export function closeDocViewer(): void {
  activeCleanup?.();
}

/**
 * Ouvre le document dans une superposition. Ne lève jamais : les erreurs de
 * chargement sont montrées dans le lecteur, avec un lien de téléchargement.
 */
export async function openDocViewer(opts: DocViewerOptions): Promise<void> {
  const lang: Lang = opts.lang ?? 'fr';
  const T = (k: string) => t(lang, k as any);
  const kind = docKind(opts.fileName || opts.url);

  closeDocViewer();

  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[120] flex flex-col bg-night-950/95 backdrop-blur';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', opts.title);
  overlay.innerHTML = `
    <header class="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
      <span class="min-w-0 flex-1 truncate text-sm font-semibold text-white">${esc(opts.title)}</span>
      <div id="dv-tools" class="flex items-center gap-1"></div>
      <a href="${esc(opts.url)}" download class="chip border border-white/20 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10">
        ${esc(T('doc_download'))}
      </a>
      <button id="dv-close" class="chip border border-white/20 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10" aria-label="${esc(T('doc_close'))}">✕</button>
    </header>
    <div id="dv-body" class="min-h-0 flex-1 overflow-auto"></div>`;

  document.body.appendChild(overlay);
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const body = overlay.querySelector<HTMLElement>('#dv-body')!;
  const tools = overlay.querySelector<HTMLElement>('#dv-tools')!;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeDocViewer();
  };
  document.addEventListener('keydown', onKey);

  activeCleanup = () => {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = previousOverflow;
    overlay.remove();
    activeCleanup = null;
  };
  overlay.querySelector('#dv-close')!.addEventListener('click', () => closeDocViewer());

  const message = (html: string) => {
    body.innerHTML = `<div class="mx-auto max-w-lg px-6 py-24 text-center text-white/80">${html}</div>`;
  };

  message(`<p class="animate-pulse">${esc(T('doc_loading'))}</p>`);

  try {
    if (kind === 'pdf') {
      await renderPdf(body, tools, opts.url, T);
    } else if (kind === 'markdown' || kind === 'text') {
      const res = await fetch(opts.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.text();
      body.innerHTML = `<article class="mx-auto max-w-3xl px-6 py-10 text-slate-100">${
        kind === 'markdown'
          ? renderMarkdown(raw)
          : `<pre class="whitespace-pre-wrap font-mono text-sm leading-relaxed">${esc(raw)}</pre>`
      }</article>`;
    } else if (kind === 'office') {
      message(`
        <p class="text-4xl">📁</p>
        <p class="mt-4 font-semibold text-white">${esc(T('doc_office_title'))}</p>
        <p class="mt-2 text-sm">${esc(T('doc_office_text'))}</p>
        <a href="${esc(opts.url)}" download class="btn-gold mt-6 inline-flex px-4 py-2 text-xs">${esc(T('doc_download'))}</a>`);
    } else {
      message(`
        <p class="text-4xl">📄</p>
        <p class="mt-4 text-sm">${esc(T('doc_unsupported'))}</p>
        <a href="${esc(opts.url)}" download class="btn-gold mt-6 inline-flex px-4 py-2 text-xs">${esc(T('doc_download'))}</a>`);
    }
  } catch (err) {
    message(`
      <p class="text-4xl">⚠️</p>
      <p class="mt-4 text-sm text-rose-300">${esc(T('doc_error'))}</p>
      <p class="mt-1 text-xs text-white/50">${esc((err as Error).message)}</p>
      <a href="${esc(opts.url)}" download class="btn-gold mt-6 inline-flex px-4 py-2 text-xs">${esc(T('doc_download'))}</a>`);
  }
}

/** Rendu PDF page par page sur un canvas, avec navigation et zoom. */
async function renderPdf(
  body: HTMLElement,
  tools: HTMLElement,
  url: string,
  T: (k: string) => string
): Promise<void> {
  const lib = await pdfLib();
  // `destroy()` est porté par la tâche de chargement, pas par le document :
  // c'est elle qui libère le worker et coupe les requêtes réseau en cours.
  const task = lib.getDocument({ url });
  const doc = await task.promise;
  const total = doc.numPages;

  /** 0 = ajusté à la largeur disponible. */
  let zoom = 0;
  let current = 1;
  const rendered = new Map<number, { cancel(): void }>();

  body.innerHTML = `<div id="dv-pages" class="mx-auto flex w-fit flex-col items-center gap-4 p-4"></div>`;
  const container = body.querySelector<HTMLElement>('#dv-pages')!;

  tools.innerHTML = `
    <button id="dv-prev" class="chip border border-white/20 px-2 py-1 text-xs text-white/80 transition hover:bg-white/10" aria-label="${esc(T('doc_prev_page'))}">←</button>
    <span class="px-1 text-xs text-white/70">
      <input id="dv-page-input" type="number" min="1" max="${total}" value="1"
        class="w-12 rounded border border-white/20 bg-transparent px-1 py-0.5 text-center text-xs text-white" />
      / ${total}
    </span>
    <button id="dv-next" class="chip border border-white/20 px-2 py-1 text-xs text-white/80 transition hover:bg-white/10" aria-label="${esc(T('doc_next_page'))}">→</button>
    <button id="dv-zoom-out" class="chip ml-1 border border-white/20 px-2 py-1 text-xs text-white/80 transition hover:bg-white/10" aria-label="${esc(T('doc_zoom_out'))}">−</button>
    <button id="dv-zoom-fit" class="chip border border-white/20 px-2 py-1 text-xs text-white/80 transition hover:bg-white/10">${esc(T('doc_fit'))}</button>
    <button id="dv-zoom-in" class="chip border border-white/20 px-2 py-1 text-xs text-white/80 transition hover:bg-white/10" aria-label="${esc(T('doc_zoom_in'))}">+</button>`;

  const pageInput = tools.querySelector<HTMLInputElement>('#dv-page-input')!;

  // Le gabarit vient de la première page : réserver la hauteur de chaque page
  // évite que le défilement saute pendant les rendus. Interroger les 892 pages
  // d'un livre juste pour connaître leurs dimensions serait bien plus coûteux.
  const first = await doc.getPage(1);
  const ratio = first.getViewport({ scale: 1 }).height / first.getViewport({ scale: 1 }).width;

  const scaleFor = (viewportWidth: number) =>
    zoom > 0 ? zoom : Math.max(0.4, Math.min((body.clientWidth - 48) / viewportWidth, 2.5));

  /** Dessine une page dans son emplacement, une seule fois. */
  async function drawPage(slot: HTMLElement) {
    const n = Number(slot.dataset.page);
    if (slot.dataset.done === '1') return;
    slot.dataset.done = '1';
    try {
      const p = await doc.getPage(n);
      const base = p.getViewport({ scale: 1 });
      const dpr = window.devicePixelRatio || 1;
      const scale = scaleFor(base.width);
      const viewport = p.getViewport({ scale: scale * dpr });

      const canvas = document.createElement('canvas');
      canvas.className = 'block rounded-lg bg-white shadow-2xl';
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      const t = p.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas });
      rendered.set(n, t);
      await t.promise;
      slot.replaceChildren(canvas);
      slot.style.height = '';
    } catch {
      // Rendu annulé (changement de zoom) : l'emplacement sera repeint.
      slot.dataset.done = '';
    }
  }

  /** (Re)construit les emplacements, vides, à la taille attendue. */
  function buildSlots() {
    rendered.forEach((t) => t.cancel());
    rendered.clear();
    const width = zoom > 0 ? first.getViewport({ scale: zoom }).width : Math.min(body.clientWidth - 48, 1200);
    container.replaceChildren(
      ...Array.from({ length: total }, (_, i) => {
        const slot = document.createElement('div');
        slot.dataset.page = String(i + 1);
        slot.className = 'relative flex items-center justify-center rounded-lg bg-white/5';
        slot.style.width = `${width}px`;
        slot.style.height = `${width * ratio}px`;
        return slot;
      })
    );
    container.querySelectorAll<HTMLElement>('[data-page]').forEach((el) => observer.observe(el));
  }

  // Seules les pages proches du viewport sont rendues : indispensable pour un
  // document de plusieurs centaines de pages.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) void drawPage(e.target as HTMLElement);
      }
    },
    { root: body, rootMargin: '250% 0px' }
  );

  // Indicateur de page : la page la plus proche du haut de la zone visible.
  const spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          current = Number((e.target as HTMLElement).dataset.page);
          if (document.activeElement !== pageInput) pageInput.value = String(current);
        }
      }
    },
    { root: body, rootMargin: '-45% 0px -45% 0px' }
  );

  const observeSpy = () =>
    container.querySelectorAll<HTMLElement>('[data-page]').forEach((el) => spy.observe(el));

  function goTo(n: number, smooth = true) {
    const target = Math.min(Math.max(1, n), total);
    const slot = container.querySelector<HTMLElement>(`[data-page="${target}"]`);
    if (!slot) return;
    body.scrollTo({ top: slot.offsetTop - container.offsetTop, behavior: smooth ? 'smooth' : 'auto' });
  }

  function rebuild() {
    const keep = current;
    buildSlots();
    observeSpy();
    goTo(keep, false);
  }

  tools.querySelector('#dv-prev')!.addEventListener('click', () => goTo(current - 1));
  tools.querySelector('#dv-next')!.addEventListener('click', () => goTo(current + 1));
  pageInput.addEventListener('change', () => goTo(Number(pageInput.value) || 1));
  tools.querySelector('#dv-zoom-in')!.addEventListener('click', () => {
    zoom = (zoom || scaleFor(first.getViewport({ scale: 1 }).width)) * 1.25;
    rebuild();
  });
  tools.querySelector('#dv-zoom-out')!.addEventListener('click', () => {
    zoom = Math.max(0.25, (zoom || scaleFor(first.getViewport({ scale: 1 }).width)) / 1.25);
    rebuild();
  });
  tools.querySelector('#dv-zoom-fit')!.addEventListener('click', () => {
    zoom = 0;
    rebuild();
  });

  const onKey = (e: KeyboardEvent) => {
    if (document.activeElement === pageInput) return;
    if (e.key === 'PageDown') {
      e.preventDefault();
      goTo(current + 1);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      goTo(current - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      goTo(total);
    }
  };
  document.addEventListener('keydown', onKey);

  let resizeTimer: number | undefined;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuild, 200);
  };
  window.addEventListener('resize', onResize);

  const previous = activeCleanup!;
  activeCleanup = () => {
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    window.clearTimeout(resizeTimer);
    observer.disconnect();
    spy.disconnect();
    rendered.forEach((t) => t.cancel());
    void task.destroy();
    previous();
  };

  buildSlots();
  observeSpy();
}

/**
 * Peint les canevas déposés par les slides « document » du studio.
 * Chaque canevas porte `data-pdf-url` et `data-pdf-page` ; on ignore ceux qui
 * ont déjà été rendus pour ne pas re-télécharger à chaque re-rendu.
 */
export async function hydratePdfSlides(root: ParentNode): Promise<void> {
  const canvases = root.querySelectorAll<HTMLCanvasElement>('canvas[data-pdf-url]:not([data-pdf-done])');
  for (const canvas of canvases) {
    canvas.dataset.pdfDone = '1';
    const ok = await renderPdfPageInto(
      canvas,
      canvas.dataset.pdfUrl!,
      Number(canvas.dataset.pdfPage) || 1
    );
    if (!ok) {
      const fallback = document.createElement('div');
      fallback.style.cssText =
        'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.5em;opacity:.7';
      fallback.textContent = '📄';
      canvas.replaceWith(fallback);
    }
  }
}

/** Nombre de pages d'un PDF (0 si illisible). */
export async function pdfPageCount(url: string): Promise<number> {
  try {
    const lib = await pdfLib();
    const task = lib.getDocument({ url });
    const doc = await task.promise;
    const n = doc.numPages;
    void task.destroy();
    return n;
  } catch {
    return 0;
  }
}

/**
 * Rend la première page d'un PDF dans un canvas fourni (aperçu et projection).
 * Retourne `false` si le document est illisible, pour laisser l'appelant
 * afficher un repli.
 */
export async function renderPdfPageInto(
  canvas: HTMLCanvasElement,
  url: string,
  pageNumber = 1,
  maxWidth = 1600
): Promise<boolean> {
  try {
    const lib = await pdfLib();
    const task = lib.getDocument({ url });
    const doc = await task.promise;
    const p = await doc.getPage(Math.min(Math.max(1, pageNumber), doc.numPages));
    const base = p.getViewport({ scale: 1 });
    const viewport = p.getViewport({ scale: Math.min(maxWidth / base.width, 3) });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await p.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas }).promise;
    void task.destroy();
    return true;
  } catch {
    return false;
  }
}

// ===========================================================================
// Lecture continue d'un PDF (projection)
// ===========================================================================

/**
 * Documents déjà ouverts, par URL. Sans ce cache, chaque page rendue
 * retéléchargeait le fichier entier — rédhibitoire pour un document de
 * plusieurs centaines de pages.
 */
const openDocs = new Map<string, Promise<any>>();

function openPdf(url: string): Promise<any> {
  let doc = openDocs.get(url);
  if (!doc) {
    doc = pdfLib().then((lib) => lib.getDocument({ url }).promise);
    openDocs.set(url, doc);
  }
  return doc;
}

export interface PdfScroller {
  /** Amène la page demandée (1-based) en haut de la zone visible. */
  scrollToPage(n: number): void;
  /** Facteur de zoom, 1 = page à la largeur du cadre. */
  setZoom(z: number): void;
  getZoom(): number;
  /** Page actuellement en haut de la zone visible (1-based). */
  currentPage(): number;
  destroy(): void;
}

/**
 * Affiche un PDF en défilement continu : les pages sont empilées et la
 * molette fait défiler le document, pas la présentation.
 *
 * Seules les pages proches de la zone visible sont peintes ; les autres ne
 * sont que des cadres à la bonne proportion. Un document de 892 pages tient
 * ainsi en mémoire sans effondrer le navigateur.
 */
export async function mountPdfScroller(
  container: HTMLElement,
  url: string,
  opts: { zoom?: number; onPageChange?: (page: number) => void } = {}
): Promise<PdfScroller | null> {
  let doc: any;
  try {
    doc = await openPdf(url);
  } catch (e: any) {
    console.error('[pdf] ouverture impossible', url, e);
    container.dataset.pdfError = String(e?.message ?? e);
    openDocs.delete(url); // ne pas figer un échec dans le cache
    return null;
  }

  let zoom = opts.zoom ?? 1;
  const total: number = doc.numPages;

  container.innerHTML = '';
  container.style.cssText =
    'position:absolute;inset:0;overflow:auto;background:#525659;scroll-behavior:auto;-webkit-overflow-scrolling:touch';

  const track = document.createElement('div');
  track.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0';
  container.appendChild(track);

  // Proportion de la première page : suffit à dimensionner les cadres, les
  // pages d'un même document ayant presque toujours le même format.
  const first = await doc.getPage(1);
  const base = first.getViewport({ scale: 1 });
  const ratio = base.height / base.width;

  const slots: HTMLDivElement[] = [];
  for (let i = 1; i <= total; i++) {
    const slot = document.createElement('div');
    slot.dataset.page = String(i);
    slot.style.cssText = 'position:relative;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.35);flex:0 0 auto';
    track.appendChild(slot);
    slots.push(slot);
  }

  function applyZoom() {
    const width = Math.max(120, container.clientWidth * zoom - 20);
    for (const slot of slots) {
      slot.style.width = `${width}px`;
      slot.style.height = `${width * ratio}px`;
      // Le rendu existant n'est plus à la bonne échelle
      slot.dataset.rendered = '';
      slot.innerHTML = '';
    }
    void paintVisible();
  }

  const rendering = new Set<number>();

  async function paint(n: number) {
    const slot = slots[n - 1];
    if (!slot || slot.dataset.rendered === '1' || rendering.has(n)) return;
    rendering.add(n);
    try {
      const page = await doc.getPage(n);
      const vp1 = page.getViewport({ scale: 1 });
      const scale = Math.min((slot.clientWidth || 800) / vp1.width, 4);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.cssText = 'display:block;width:100%;height:100%';
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas }).promise;
      if (slot.dataset.rendered !== '1') {
        slot.innerHTML = '';
        slot.appendChild(canvas);
        slot.dataset.rendered = '1';
      }
    } catch {
      /* page illisible : le cadre blanc reste */
    } finally {
      rendering.delete(n);
    }
  }

  /** Peint la fenêtre visible et quelques pages de marge, libère les lointaines. */
  async function paintVisible() {
    const top = container.scrollTop;
    const bottom = top + container.clientHeight;
    const nearby: number[] = [];
    slots.forEach((slot, idx) => {
      const y = slot.offsetTop;
      const h = slot.offsetHeight;
      const visible = y + h > top - h * 2 && y < bottom + h * 2;
      if (visible) nearby.push(idx + 1);
      else if (slot.dataset.rendered === '1' && (y + h < top - h * 6 || y > bottom + h * 6)) {
        slot.innerHTML = '';
        slot.dataset.rendered = '';
      }
    });
    for (const n of nearby) await paint(n);
  }

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      void paintVisible();
      opts.onPageChange?.(current());
    });
  };
  container.addEventListener('scroll', onScroll, { passive: true });

  function current(): number {
    const top = container.scrollTop + container.clientHeight * 0.3;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].offsetTop + slots[i].offsetHeight > top) return i + 1;
    }
    return total;
  }

  applyZoom();

  return {
    scrollToPage(n) {
      const slot = slots[Math.min(Math.max(1, n), total) - 1];
      if (slot) container.scrollTop = slot.offsetTop - 10;
      void paintVisible();
    },
    setZoom(z) {
      zoom = Math.min(5, Math.max(0.4, z));
      applyZoom();
    },
    getZoom: () => zoom,
    currentPage: current,
    destroy() {
      container.removeEventListener('scroll', onScroll);
      container.innerHTML = '';
    },
  };
}
