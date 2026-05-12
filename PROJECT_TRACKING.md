# 🗓️ Suivi de Projet : Adventools (Gestion Scrum)

Bienvenue dans le tableau de bord de gestion de projet. Ce document sert de source de vérité pour l'évolution de l'application **Adventools**.

## 📊 État Actuel du Projet
- **Version actuelle** : 1.2.1
- **Dernier Sprint** : Sprint 4 (Terminé ✅)
- **Sprint Actuel** : Sprint 5 (En cours 🟢)
- **Prochain Sprint** : Sprint 6 (En préparation 🔄)

---

## 🏃 Sprints

### 🟢 Sprint 5 : Intelligence & Connectivité (En cours)
**Objectif** : Améliorer l'accessibilité des données et la pérennité des notes utilisateur.

| ID | Tâche | Priorité | État |
| :--- | :--- | :--- | :--- |
| **US-31** | Recherche Globale (Leçons + Notes) | 🔥 Haute | ✅ Terminé |
| **US-32** | Sauvegarde Cloud (Export/Import chiffré) | ☁️ Moyenne | ✅ Terminé |
| **US-33** | Système de Favoris & Signets (Audit & Unification) | ⭐ Moyenne | ✅ Vérifié |
| **US-34** | Optimisation Audio (Background Playback) | 🎵 Moyenne | ✅ Terminé |

### ✅ Sprint 4 : Sécurité & Expérience Premium (Terminé)
**Objectif** : Sécuriser les données personnelles et parfaire l'interface utilisateur.

| ID | Tâche | Priorité | État |
| :--- | :--- | :--- | :--- |
| **US-21** | Chiffrement AES des notes (Leçons & Journal) | 🛡️ Haute | ✅ Terminé |
| **US-22** | Unification du système de stockage des notes | ⚙️ Moyenne | ✅ Terminé |
| **US-23** | Gestionnaire de stockage (Nettoyage cache/PDF) | 🧹 Moyenne | ✅ Terminé |
| **US-24** | Polissage du Mode Sombre (Markdown & Composants) | 🎨 Moyenne | ✅ Terminé |
| **US-25** | Téléchargement "Full Offline" (Images & PDF) | 🛰️ Haute | ✅ Terminé |
| **UX-03** | Affichage des jours (basé sur la date réelle) | ✨ Mineure | ✅ Terminé |

### ✅ Sprint 3 : Modularisation & Robustesse (Terminé)
**Objectif** : Améliorer la maintenabilité du code (surtout `lesona.tsx`) et renforcer la validation des données API.

| ID | Tâche | Priorité | État |
| :--- | :--- | :--- | :--- |
| **US-11** | Diviser `lesona.tsx` en composants atomiques | 🔥 Haute | ✅ Terminé |
| **US-12** | Installer et implémenter `Zod` pour la validation API | ⚡ Moyenne | ✅ Terminé |
| **US-13** | Uniformiser les Toasts/Alertes dans toute l'application | 🎨 Moyenne | ✅ Terminé |
| **US-14** | Optimisation du chargement des titres de leçons (batch fetch) | 🚀 Moyenne | ✅ Terminé |
| **UX-01** | Badge "Enregistré" dynamique et Debounce sur les notes | ✨ Mineure | ✅ Terminé |
| **UX-02** | Alertes de confirmation thémées (PremiumAlert) | 🎨 Mineure | ✅ Terminé |
| **BUG-01**| Fix écrasement données hors-ligne lors du téléchargement | 🐛 Critique | ✅ Terminé |

### ✅ Sprint 2 : Refactoring & Linting (Terminé)
- Extraction de `AudioPlayer`, `VideoPlayer`, `NoteCard` et `DrawModal`.
- Mise en place d'ESLint.
- Gestion des erreurs réseau (timeout/retry).

### ✅ Sprint 1 : Stabilisation & Performance (Terminé)
- Correction des permissions notifications.
- Optimisation SQL N+1.
- Centralisation des utilitaires de fichiers.

---

## 📋 Backlog (Futur)
### 🚀 Sprint 6 : Écosystème & Widgets Natifs (Proposé)
**Objectif** : Intégrer l'application au cœur du téléphone via des composants système natifs.

| ID | Tâche | Priorité | État |
| :--- | :--- | :--- | :--- |
| **US-35** | Widgets Écran d'accueil (Veille Matinale, Leçon, Raccourcis) | 🔥 Haute | ✅ Terminé |
| **US-36** | Raccourcis d'application (App Shortcuts / Appui long) | ⭐ Moyenne | ✅ Terminé |
| **US-37** | Mode sombre dynamique basé sur le système (US-UI) | 🎨 Moyenne | ❌ Annulé |

---

## 📋 Backlog (En attente)
- [ ] **US-SQL** : Implémenter SQLCipher pour le chiffrement des notes.
- [ ] **US-CDN** : Migration des assets i18n vers un CDN/Miroir.
- [ ] **US-UI** : Mode sombre dynamique basé sur le système (amélioration).

---

## 🛠️ Instructions pour Antigravity (PM Mode)
1. **Toujours** mettre à jour ce fichier après chaque étape majeure.
2. **Ne jamais** modifier `lesona.tsx` massivement sans sauvegarder une version stable.
3. **Tester** chaque petit composant après extraction.
