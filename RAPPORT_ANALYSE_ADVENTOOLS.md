# Rapport d'Analyse Technico-Fonctionnelle : Adventools

> **Date d'analyse :** 12 Mai 2026
> **Objet :** Audit de performance, sécurité et maintenabilité pour passage en production.

---

## 1. Analyse des Erreurs et Bugs Potentiels

| Type | Description | Impact | Statut |
| :--- | :--- | :--- | :--- |
| **Permissions** | Double requête de permission pour les notifications dans `_layout.tsx`. | **Faible** | ✅ **Corrigé — Sprint 1 (US-01)** |
| **UX / Feedback** | Le badge "Enregistré" dans `QuestionBlock` (`lesona.tsx`) était statique, non relié à l'état async. | **Moyen** | ✅ **Corrigé — Sprint 1 (US-05)** |
| **Robustesse** | Opérateurs `!!` non-null dans `i18n-manager.ts` sans vérification de nullité. | **Moyen** | ✅ **Corrigé — Sprint 1 (US-04)** |
| **Mise à jour** | Le système d'auto-update APK dépend de l'autorisation "Sources inconnues". | **Moyen** | 🔄 Accepté — risque géré par UX alert existante |

---

## 2. Optimisation des Performances (Goulots d'étranglement)

### 🚀 Base de Données (SQLite)
- **Problème N+1 Query** : Dans `user-storage.ts`, la fonction `getAllNotes` exécutait une requête SQL par note.
- **Statut** : ✅ **Corrigé — Sprint 1 (US-02)** — Architecture 2-query avec batch `IN(...)` et assemblage mémoire.

### 🌐 Efficacité Réseau
- **Requêtes en boucle** : Dans `lesona.tsx`, la fonction `loadLessonTitles` effectue des `fetch` individuels pour chaque leçon.
- **Statut** : 🔴 **Backlog** — Nécessite une évolution côté serveur/API (Sprint 3+)
- **Gestion des erreurs** : Amélioration de la fiabilité des appels réseau (timeout/retry).
- **Statut** : ✅ **Amélioré — Sprint 2 (US-06)** — Implémentation de timeouts et retries dans `mofonaina.ts`.

### 🧵 Architecture (Maintenabilité)
- **Code dupliqué** : La fonction `saveFilePermanently` était copiée dans 3 fichiers.
- **Statut** : ✅ **Corrigé — Sprint 1 (US-03)** — Centralisé dans `lib/utils.ts`.
- **Composants monolithiques** : `lesona.tsx` (>2300 lignes) et `notes.tsx` (>1200 lignes).
- **Statut** : ✅ **Amélioré — Sprint 2 (US-08, 09, 10)** — Extraction de `AudioPlayer`, `VideoPlayer`, `NoteCard` et `DrawModal` hors de `notes.tsx`.

---

## 3. Analyse de la Sécurité et Stabilité

1. **Données Utilisateur** : La base SQLite stocke les notes en clair. 🔴 **Backlog** — SQLCipher envisageable à long terme.
2. **Infrastructure** : Dépendance GitHub Raw pour l'i18n et les mises à jour. 🔴 **Accepté** — CDN/miroir à planifier.
3. **Qualité du code** : Absence de standards de linting automatisés.
4. **Statut** : ✅ **Corrigé — Sprint 2 (US-07)** — Configuration d'ESLint pour le projet.

---

## 4. Suivi du Sprint Agile

### ✅ Sprint 1 — LIVRÉ (12 Mai 2026)
| Ticket | Description | Fichier(s) impactés |
| :--- | :--- | :--- |
| US-01 | Suppression double permission notifications | `app/_layout.tsx` |
| US-02 | Optimisation SQL N+1 → batch query | `lib/user-storage.ts` |
| US-03 | Centralisation `saveFilePermanently` | `lib/utils.ts`, `notes.tsx`, `lesona.tsx` |
| US-04 | Fix null-safety `i18n-manager.ts` | `lib/i18n-manager.ts` |
| US-05 | Feedback asynchrone réel dans `QuestionBlock` | `app/utiles/lesona.tsx` |

### ✅ Sprint 2 — LIVRÉ (12 Mai 2026)
| Ticket | Description | Fichier(s) impactés |
| :--- | :--- | :--- |
| US-06 | Gestion erreurs réseau (timeout/retry) | `lib/mofonaina.ts` |
| US-07 | Configuration ESLint | `.eslintrc.js` |
| US-08 | Extraction AudioPlayer & VideoPlayer | `components/notes/`, `notes.tsx` |
| US-09 | Extraction NoteCard | `components/notes/`, `notes.tsx` |
| US-10 | Extraction DrawModal | `components/notes/`, `notes.tsx` |

### 🔄 Sprint 3 — Backlog (À planifier)
- [ ] Diviser `lesona.tsx` en modules atomiques (PRUDENCE).
- [ ] Implémenter une validation de schéma (Zod) pour les API.
- [ ] Améliorer le feedback utilisateur global (Toasts/Alertes).

---

**Analyse effectuée par :** Antigravity AI (rôle : Product Manager / Tech Lead)
**Sprint 1 & 2 :** ✅ 10/10 tickets livrés
**Prochaine revue :** À définir avec l'équipe
