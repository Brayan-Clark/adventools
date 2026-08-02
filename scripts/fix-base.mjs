/**
 * Post-build : préfixe tous les liens internes du HTML généré avec le base path
 * GitHub Pages (/adventools).
 *
 * Astro ne préfixe que ses propres assets (_astro/*) mais PAS les liens écrits
 * manuellement dans les templates (<a href="/sermons">, <img src="/favicon.svg">…).
 * Sur GitHub Pages, sans préfixe, ces liens pointeraient vers la racine du
 * domaine (brayan-clark.github.io/sermons au lieu de …/adventools/sermons).
 *
 * Ce script réécrit le HTML de dist/ après `astro build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = '/adventools';
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function prefixUrl(url) {
  // Ne touche pas aux liens externes, protocoles spéciaux, ancres pures
  // et chemins relatifs (sans slash initial).
  if (/^(https?:|mailto:|tel:|data:|javascript:|#|\?|\/\/)/i.test(url)) return url;
  // Déjà préfixé ou asset généré par Astro
  if (url.startsWith(`${BASE}/`) || url.startsWith('/_astro/')) return url;
  // Chemins absolus internes → on préfixe
  if (url.startsWith('/')) return `${BASE}${url}`;
  return url;
}

let changed = 0;
let files = 0;

for (const file of walk(DIST)) {
  const original = fs.readFileSync(file, 'utf8');

  // href="…" et src="…"
  let html = original.replace(
    /(href|src)="([^"]*)"/g,
    (m, attr, url) => `${attr}="${prefixUrl(url)}"`
  );

  // srcset="…" (peut contenir plusieurs URLs séparées par des virgules)
  html = html.replace(
    /srcset="([^"]*)"/g,
    (m, value) => {
      const rewritten = value
        .split(',')
        .map((part) => {
          const seg = part.trim().split(/\s+/);
          if (seg.length === 0) return part;
          return `${prefixUrl(seg[0])} ${seg.slice(1).join(' ')}`.trim();
        })
        .join(', ');
      return `srcset="${rewritten}"`;
    }
  );

  if (html !== original) {
    fs.writeFileSync(file, html);
    changed++;
  }
  files++;
}

console.log(`[fix-base] Base "${BASE}" appliquée : ${changed}/${files} fichiers HTML modifiés.`);
