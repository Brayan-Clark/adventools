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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: ['**/uploads/**', '**/icons/logo.svg'],
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
            // Fichiers SQLite bible (adventools raw) : cache à la demande
            urlPattern: ({ url }) => url.hostname.includes('githubusercontent.com') && url.pathname.includes('/bible/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ah-bible-db',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 90 },
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
