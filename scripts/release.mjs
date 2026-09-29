#!/usr/bin/env node
/**
 * Prépare et déclenche une publication Android.
 *
 *   npm run release -- 1.3.4
 *
 * Vérifie l'état du dépôt et les notes de version, met à jour app.json,
 * pousse le commit, puis lance le workflow GitHub qui construit l'APK signé
 * et crée la release. Le build tourne sur les runners GitHub, pas ici.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim();

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  fail('Usage: npm run release -- <version>   (ex. npm run release -- 1.3.4)');
}

// --- état du dépôt -------------------------------------------------------
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
if (branch !== 'main') fail(`Publication depuis main uniquement (branche courante : ${branch}).`);

if (run('git', ['status', '--porcelain'])) {
  fail('Des modifications ne sont pas commitées. Committez ou remisez-les d\'abord.');
}

run('git', ['fetch', 'origin', 'main']);
if (run('git', ['rev-parse', 'HEAD']) !== run('git', ['rev-parse', 'origin/main'])) {
  fail('La branche locale diffère de origin/main. Faites un pull/push avant de publier.');
}

const tags = run('git', ['tag', '--list', `V${version}`]);
if (tags) fail(`Le tag V${version} existe déjà.`);

// --- notes de version ----------------------------------------------------
let notes;
try {
  notes = run('node', ['scripts/changelog.mjs', version]);
} catch {
  fail(`Aucune note pour ${version} dans CHANGELOG.md. Ajoutez une section « ## [${version}] - AAAA-MM-JJ » avant de publier.`);
}

console.log(`\n────────── Notes de version ${version} ──────────\n`);
console.log(notes);
console.log('\n──────────────────────────────────────────────\n');

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = (await rl.question('Publier avec ces notes ? [o/N] ')).trim().toLowerCase();
rl.close();
if (answer !== 'o' && answer !== 'oui') fail('Publication annulée.');

// --- bump app.json -------------------------------------------------------
const app = JSON.parse(readFileSync('app.json', 'utf8'));
const previous = app.expo.version;
app.expo.version = version;
app.expo.android.versionCode = (app.expo.android.versionCode ?? 0) + 1;
writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');

console.log(`app.json : ${previous} → ${version} (versionCode ${app.expo.android.versionCode})`);

run('git', ['add', 'app.json']);
run('git', ['commit', '-m', `chore(release): ${version}`]);
run('git', ['push', 'origin', 'main']);

// --- déclenchement du workflow ------------------------------------------
run('gh', ['workflow', 'run', 'release-android.yml', '-f', `version=${version}`]);

console.log(`\n✓ Build lancé pour la version ${version}.`);
console.log('  Suivi : gh run watch   (ou onglet Actions sur GitHub)');
console.log('  L\'APK signé et la release apparaîtront à la fin du build (~30 min).\n');
