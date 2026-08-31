// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import VitePWA from '@vite-pwa/astro';

// Base path GitHub Pages : le repo cible est « adventools », donc le site
// vit à https://brayan-clark.github.io/adventools/
const BASE = '/adventools';

// https://astro.build/config
export default defineConfig({
  site: 'https://brayan-clark.github.io',
  base: BASE,
  output: 'static',
  integrations: [
    tailwind({ applyBaseStyles: false }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png'],
      manifest: {
        name: 'Andeaha Hizaha',
        short_name: 'Andeaha',
        description:
          'Plateforme publique d\'étude biblique : sermons vidéo, cours, audio & séminaires. Andeha hizaha isika !',
        lang: 'fr',
        display: 'standalone',
        start_url: BASE + '/',
        scope: BASE + '/',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        categories: ['education', 'religion', 'lifestyle'],
        icons: [
          {
            src: BASE + '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: BASE + '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: BASE + '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Le précache ne contient QUE la coquille de l'application.
        //
        // L'ancien motif embarquait tout le HTML et tous les binaires générés :
        // 1591 entrées pour 71 Mo, que le navigateur téléchargeait dès la
        // première visite (dont 373 Mo de PDF et 78 Mo de pages cantiques).
        // Les contenus lourds (PDF, bases SQLite, JSON de données) sont
        // désormais mis en cache à l'usage via runtimeCaching.
        globPatterns: ['**/*.{js,css,woff2}', 'index.html', 'offline.html', '404.html'],
        globIgnores: [
          '**/uploads/**',
          '**/docs/**',
          '**/data/**',
          '**/icons/logo.svg',
          '**/*.SQLite3',
          '**/*.db',
        ],
        // Un fichier .wasm de 648 Ko ne doit pas être imposé à qui ne lit
        // jamais la Bible : il est mis en cache au premier usage.
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: BASE + '/offline.html',
        runtimeCaching: [
          {
            // Pages visitées : réseau d'abord, cache en secours
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ah-pages',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // API Supabase : réseau d'abord (offline => cache)
            urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ah-supabase',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Index et listes de la branche `data` : ils décrivent ce qui
            // existe, ils doivent donc toujours être frais. En CacheFirst
            // (l'ancien réglage), un recueil ou un document ajouté sur GitHub
            // n'apparaissait jamais — le service worker resservait sa copie
            // pendant 30 à 90 jours.
            urlPattern: ({ url }) =>
              url.hostname.includes('githubusercontent.com') && url.pathname.endsWith('.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ah-data-index',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Fichiers lourds de la branche `data` (bases SQLite, PDF).
            // Le contenu applicatif revalide lui-même ces fichiers ; le cache
            // du service worker ne sert que de secours hors-ligne.
            urlPattern: ({ url }) =>
              url.hostname.includes('githubusercontent.com') &&
              /\.(db|sqlite3?|pdf|docx?|pptx?|odp)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ah-data-files',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Données embarquées (JSON cantiques/mofonaina) + moteur SQLite WASM :
            // servis depuis le cache, rafraîchis en arrière-plan.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && (url.pathname.includes('/data/') || url.pathname.endsWith('.wasm')),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ah-static-data',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Icônes, favicon et images du site
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ah-local-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Images distantes (Unsplash)
            urlPattern: ({ url }) => url.hostname.includes('unsplash.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ah-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Google Fonts
            urlPattern: ({ url }) =>
              url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ah-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      injectRegister: false,
      devOptions: { enabled: false },
    }),
  ],
});
