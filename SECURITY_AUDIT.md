# Rapport d'Audit de Sécurité - Application Mobile Adventools

## 1. Introduction
Ce rapport présente les résultats de l'analyse de sécurité effectuée sur le code source de l'application mobile Adventools. L'objectif est d'identifier les vulnérabilités potentielles et de proposer des recommandations de correction pour renforcer la protection des données utilisateur.

## 2. Résumé des Résultats
L'audit a révélé plusieurs vulnérabilités, allant de critiques à mineures. La vulnérabilité la plus préoccupante concerne la gestion des clés de chiffrement.

| Vulnérabilité | Criticité | Statut |
| :--- | :--- | :--- |
| Clé de chiffrement codée en dur | **Critique** | À corriger |
| Stockage non sécurisé de données sensibles | **Élevée** | À corriger |
| Permissions Android excessives | **Moyenne** | À corriger |
| Exposition des données en mémoire | **Faible** | À optimiser |

---

## 3. Détails des Vulnérabilités

### 3.1 Clé de chiffrement codée en dur
- **Fichier impacté :** [security.ts](file:///home/programmeur/Bureau/Workspace/adventools-apk/lib/security.ts)
- **Description :** La clé `APP_SECRET_KEY` utilisée pour le chiffrement AES-256 est inscrite directement dans le code source.
- **Impact :** Un attaquant peut décompiler l'APK, extraire la clé et déchiffrer toutes les données "sécurisées" de l'utilisateur (notes personnelles, sauvegardes, etc.).
- **Recommandation :** 
  - Ne jamais stocker de clés de chiffrement en dur.
  - Utiliser le **Keystore** (Android) ou la **Keychain** (iOS) via une bibliothèque comme `expo-secure-store` pour générer et stocker une clé unique par appareil.

### 3.2 Stockage non sécurisé de données sensibles
- **Fichier impacté :** [security.ts](file:///home/programmeur/Bureau/Workspace/adventools-apk/lib/security.ts)
- **Description :** L'application utilise `AsyncStorage` pour stocker des données chiffrées. Bien que les données soient chiffrées, elles sont stockées dans un emplacement accessible sur les appareils rootés.
- **Impact :** Combiné avec la clé codée en dur, cela facilite l'accès aux données privées.
- **Recommandation :** Utiliser `expo-secure-store` pour les petites données sensibles (jetons, clés) au lieu de `AsyncStorage`.

### 3.3 Permissions Android excessives
- **Fichier impacté :** [app.json](file:///home/programmeur/Bureau/Workspace/adventools-apk/app.json)
- **Description :** L'application demande la permission `REQUEST_INSTALL_PACKAGES`.
- **Impact :** Cette permission est considérée comme très sensible par Google. Elle peut entraîner un refus sur le Play Store si elle n'est pas justifiée par une fonctionnalité centrale (comme un installateur d'applications). Elle peut aussi être exploitée pour installer des malwares.
- **Recommandation :** Supprimer cette permission si elle n'est pas strictement nécessaire au fonctionnement de l'application.

### 3.4 Exposition des données en mémoire pour la recherche
- **Fichier impacté :** [search.tsx](file:///home/programmeur/Bureau/Workspace/adventools-apk/app/search.tsx)
- **Description :** Pour effectuer une recherche dans les notes chiffrées, l'application déchiffre l'intégralité des notes en mémoire vive (RAM).
- **Impact :** 
  1. **Performance :** Ralentissement important si l'utilisateur possède beaucoup de notes.
  2. **Sécurité :** Les données sensibles restent en clair dans la mémoire de l'appareil pendant la recherche.
- **Recommandation :** 
  - Utiliser une base de données supportant le chiffrement natif (comme SQLCipher).
  - Ou implémenter une recherche sur des index chiffrés.

---

## 4. Recommandations de Correction

1. **Migration vers Expo SecureStore :** Remplacer l'usage de `AsyncStorage` par `expo-secure-store` pour le stockage de la clé de chiffrement et des données sensibles.
2. **Gestion Dynamique des Clés :** Générer une clé aléatoire lors du premier lancement de l'application et la stocker de manière sécurisée dans le Keystore/Keychain.
3. **Audit des Permissions :** Retirer `REQUEST_INSTALL_PACKAGES` et vérifier si d'autres permissions (comme la localisation précise) sont réellement nécessaires.
4. **Sécurisation des Backups :** Utiliser une clé dérivée d'un mot de passe utilisateur (via PBKDF2) pour les fichiers de sauvegarde `.advb` afin que seul l'utilisateur puisse les restaurer sur un autre appareil.

## 5. Conclusion
L'application Adventools possède une base solide mais nécessite des ajustements critiques concernant la gestion de la cryptographie pour garantir une confidentialité réelle des données de ses utilisateurs.
