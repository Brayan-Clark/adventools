// Génère les icônes PWA PNG à partir de public/favicon.svg
import sharp from 'sharp';
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'public', 'favicon.svg');
const iconsDir = path.join(root, 'public', 'icons');

mkdirSync(iconsDir, { recursive: true });

const svg = readFileSync(svgPath);

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size, maskable } of sizes) {
  // Pour maskable : on agrandit le logo dans un carré plein (fond étendu)
  const s = maskable ? size * 1.6 : size;
  const out = path.join(iconsDir, name);
  if (maskable) {
    // canvas plus grand puis crop central pour effet "safe zone"
    await sharp(svg)
      .resize(Math.round(s), Math.round(s))
      .extract({
        left: Math.round((s - size) / 2),
        top: Math.round((s - size) / 2),
        width: size,
        height: size,
      })
      .png()
      .toFile(out);
  } else {
    await sharp(svg).resize(size, size).png().toFile(out);
  }
  console.log('✓', name);
}

// favicon.svg -> icône dans manifest
copyFileSync(svgPath, path.join(iconsDir, 'favicon.svg'));
console.log('✓ favicon.svg');
console.log('Icônes générées dans public/icons/');
