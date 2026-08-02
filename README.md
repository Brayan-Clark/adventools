# 📖 Andeaha Hizaha

**Andeaha Hizaha** — « Regardons ensemble » — est une plateforme publique d'étude de la Parole : sermons vidéo, cours bibliques (multi-leçons), audio & séminaires. Bilingue **français / malgache**, installable comme application (PWA), utilisable **hors-ligne**, et dotée d'un **assistant IA** gratuit alimenté par **Puter.js**.

![PWA](https://img.shields.io/badge/PWA-✓-7c3aed) ![Astro 5](https://img.shields.io/badge/Astro-5-ff5d01) ![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003b57) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8)

---

## ✨ Fonctionnalités

- 🏠 **Accueil spectaculaire** : hero immersif, verset du jour (rotation quotidienne), statistiques, catégories, contenus en vedette
- 🎬 **Sermons vidéo** : lecteur HTML5 intégré, comptage de vues, contenus liés
- 📚 **Cours** : playlist de leçons, lecteur intégré, **progression sauvegardée** (localStorage)
- 🎧 **Audio & méditations** : lecteur audio stylé
- 🎤 **Séminaires & événements**
- 🤖 **Assistant IA** (Puter.js) : chat en streaming, **sans clé API**, contexte du site pour recommander des contenus, mode hors-ligne avec recherche locale
- 🔍 **Recherche** instantanée avec filtres par type
- 🛡️ **Espace admin** : ajouter / modifier / supprimer des contenus, **upload de fichiers** (vidéo, audio, image) ou coller des URLs, gestion des leçons
- 🌙 **Thème sombre / clair** persistant
- 🌍 **Bilingue FR/MG** : bascule instantanée conservée par cookie
- 📱 **PWA complète** : manifest, icônes, service worker, page hors-ligne, contenu mis en cache
- 🗄️ **Stockage combiné** : SQLite (source de vérité) + JSON (seed) + localStorage (thème, langue, progression, cache hors-ligne)

---

## 🚀 Démarrage rapide

```bash
npm install          # installe les dépendances (better-sqlite3 compile)
npm run setup        # génère les icônes PWA + seed de la base SQLite
npm run dev          # http://localhost:4321
```

> 🟢 **Prérequis** : Node ≥ 23.6 (le script de seed utilise le type-stripping natif de Node). L'emplacement de la base SQLite peut être personnalisé avec la variable d'environnement `ANDEAHA_DATA_DIR` (défaut : `<projet>/data`).

Pour le build de production et le test de la PWA :

```bash
npm run build        # build SSR + service worker PWA
npm run preview      # serveur de production
```

> ⚙️ Le site se seed automatiquement au premier accès si la base est vide. Pour recréer la base : `npm run seed`.

---

## 🔐 Espace admin

| Élément | Valeur |
|---|---|
| URL | `/admin` |
| Mot de passe par défaut | `andeaha2026` |

Le mot de passe est stocké haché (SHA-256) dans la table `settings` de SQLite. Pour le changer, mettez à jour le hash via la base (`data/andeaha.db`) ou en éditant le seed. Les jetons d'authentification vivent en mémoire : après un redémarrage du serveur, reconnectez-vous.

> ⚠️ **Sécurité** : ce projet est une démo / site public — remplacez le mot de passe par défaut avant toute mise en production et ajoutez HTTPS (obligatoire pour la PWA).

---

## 🤖 Assistant IA (Puter.js)

L'assistant utilise [Puter.js](https://docs.puter.com/) (CDN `https://js.puter.com/v2/`) — accès à des centaines de modèles IA **sans clé API ni infrastructure** :

- `puter.ai.chat()` en **streaming** (réponses affichées en direct)
- Sélecteur de modèle (parcours de `puter.ai.listModels()`)
- Contexte du site injecté (titre, prédicateur, lien) pour des recommandations précises
- **Hors-ligne** : bascule automatique sur une recherche locale du contenu en cache

L'IA est gratuite pour vous : chaque utilisateur couvre sa propre consommation (modèle « user-pays » de Puter).

---

## 🗄️ Architecture & données

```
andeaha-hizaha/
├── data/
│   ├── content.json        # données de seed (bilingues)
│   └── andeaha.db          # base SQLite (générée)
├── public/
│   ├── favicon.svg         # logo (livre + soleil + croix)
│   ├── icons/              # icônes PWA générées (sharp)
│   ├── uploads/            # fichiers uploadés via l'admin
│   └── offline.html        # page hors-ligne PWA
├── scripts/
│   ├── seed.ts             # reseed de la base
│   └── generate-icons.mjs  # icônes PNG depuis le SVG
└── src/
    ├── lib/
    │   ├── db.ts           # better-sqlite3 : schéma, seed, requêtes, CRUD
    │   ├── admin.ts        # auth admin (SHA-256 + jetons)
    │   ├── i18n.ts         # dictionnaire FR/MG + getLang(cookie)
    │   ├── types.ts        # types partagés
    │   └── utils.ts        # helpers (dates, vues, tags)
    ├── components/         # Header, Footer, MediaCard, players, AiChat…
    ├── layouts/Layout.astro
    └── pages/
        ├── index.astro             # accueil
        ├── sermons/, cours/, audio/, seminaires/   # listes + détails
        ├── assistant.astro         # chat IA dédié
        ├── recherche.astro         # recherche instantanée
        ├── admin/                  # tableau de bord CRUD + upload
        └── api/                    # content, search, media, upload, auth
```

### Stockage combiné (comme demandé)

| Couche | Rôle |
|---|---|
| **SQLite** (`better-sqlite3`) | Source de vérité : contenus, catégories, versets, réglages |
| **JSON** (`data/content.json`) | Seed reproductible + format d'échange de l'API `/api/content` |
| **localStorage** | Thème, progression des cours, cache hors-ligne (`ah-content`) |
| **Cookie `ah-lang`** | Langue active conservée pendant la navigation (FR/MG) |

---

## 🧰 Stack technique

- **Astro 5** (SSR, adaptateur Node) — [astro.build](https://astro.build)
- **Tailwind CSS 3** (thème sombre/clair via classe `dark`)
- **better-sqlite3** (SQLite synchrone & fiable)
- **@vite-pwa/astro** (manifest + service worker Workbox)
- **Puter.js** (IA gratuite, sans clé API)
- **sharp** (génération des icônes PNG)

---

## 🗂️ Routes principales

| Route | Description |
|---|---|
| `/` | Accueil |
| `/sermons` · `/sermons/[slug]` | Sermons vidéo |
| `/cours` · `/cours/[slug]` | Cours + leçons |
| `/audio` · `/audio/[slug]` | Audio & méditations |
| `/seminaires` · `/seminaires/[slug]` | Séminaires |
| `/assistant` | Chat IA |
| `/recherche` | Recherche |
| `/admin` | Gestion des contenus |
| `/api/content` | Bundle JSON complet (offline + IA) |
| `/api/search?q=` | Recherche API |
| `/api/media` · `/api/media/[id]` | CRUD (admin) |
| `/api/upload` | Upload de fichiers (admin) |
| `/api/auth` | Login admin |

---

## 🤝 Contribution

Projet de démonstration — libre à toi d'ajouter des contenus via l'admin, de traduire, ou d'étendre. Fait avec foi, à Madagascar 🇲🇬
