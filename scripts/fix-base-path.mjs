/**
 * Corrige le bug du base path : normalise `const BASE = import.meta.env.BASE_URL`
 * pour qu'il termine TOUJOURS par '/'. Sans ce slash, les liens deviennent
 * `/adventoolsmofonaina` au lieu de `/adventools/mofonaina`.
 *
 * Exécute : node scripts/fix-base-path.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const OLD = "const BASE = import.meta.env.BASE_URL ?? '/';";
const NEW = "const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\\/?$/, '/');";

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(astro|ts|tsx|js)$/.test(entry.name)) out.push(p);
  }
  return out;
}

let fixed = 0;
for (const file of walk(SRC)) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(OLD)) {
    fs.writeFileSync(file, content.split(OLD).join(NEW));
    console.log(`✓ ${path.relative(SRC, file)}`);
    fixed++;
  }
}
console.log(`\n${fixed} fichier(s) corrigé(s).`);
