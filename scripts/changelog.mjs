#!/usr/bin/env node
/**
 * Extrait les notes de version d'une version donnée depuis CHANGELOG.md.
 *
 * Utilisé par le workflow de release pour composer le corps de la publication
 * GitHub. Échoue si la section n'existe pas : une version se publie avec ses
 * notes, jamais sans.
 *
 *   node scripts/changelog.mjs 1.3.4
 */
import { readFileSync } from 'node:fs';

// Version qui bascule sur la clé de signature de release. Les APK publiés
// avant étaient signés avec la clé debug du gabarit Expo : Android refuse une
// mise à jour lorsque la signature change, d'où l'avertissement. À retirer une
// fois cette version largement installée.
const SIGNING_CHANGED_IN = '1.3.4';

const SIGNING_NOTICE = `
---

### ⚠️ Mise à jour impossible depuis une version antérieure

Cette version est signée avec la clé officielle d'Adventools. Les versions
précédentes utilisaient une clé de test, et Android refuse de remplacer une
application par une autre dont la signature diffère.

**Pour installer cette version, désinstallez d'abord l'ancienne.** Faites une
sauvegarde au préalable, depuis *Profil & Paramètres → Système → Sauvegarder
les données* : la désinstallation efface les notes, surlignages et favoris
stockés sur l'appareil. Le fichier \`.advb\` obtenu se réimporte ensuite via
*Restauration Sécurisée*.

Les mises à jour suivantes se feront normalement, sans désinstallation.
`;

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/changelog.mjs <version>');
  process.exit(1);
}

const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');

// Section allant de « ## [1.3.4] » jusqu'au prochain « ## [ » (ou la fin)
const start = changelog.search(new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\]`, 'm'));
if (start === -1) {
  console.error(`Aucune section « ## [${version}] » dans CHANGELOG.md.`);
  console.error('Ajoutez les notes de cette version avant de publier.');
  process.exit(1);
}

const rest = changelog.slice(start);
const nextHeading = rest.slice(1).search(/^## \[/m);
let body = (nextHeading === -1 ? rest : rest.slice(0, nextHeading + 1)).trim();

// L'en-tête « ## [x.y.z] - date » est déjà le titre de la release GitHub
body = body.replace(/^## .*\n/, '').replace(/\n---\s*$/, '').trim();

process.stdout.write(body + (version === SIGNING_CHANGED_IN ? `\n${SIGNING_NOTICE}` : '') + '\n');
