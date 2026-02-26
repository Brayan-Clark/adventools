# 🎼 Outil de Correction de Cantiques

## Description
Cet outil permet de modifier facilement les cantiques dans les bases de données SQLite.

## Fonctionnalités
- ✅ Détection automatique des bases de données dans le dossier `hymnes/`
- ✅ Recherche par numéro de cantique
- ✅ Modification des champs: titre, clé, contenu, auteur, catégories
- ✅ Sauvegarde directe dans la base de données
- ✅ Interface web dark mode professionnelle
- ✅ Messages de confirmation intégrés (pas de redirection)

## Installation et Utilisation

### 1. Démarrer le serveur
```bash
python3 server.py
```

### 2. Ouvrir l'interface
Ouvrez votre navigateur et allez sur: http://localhost:8080

### 3. Utilisation
1. **Sélectionner la base de données**: Choisissez parmi les bases détectées automatiquement
2. **Entrer le numéro du cantique**: Par exemple 182
3. **Cliquer sur "Charger"** pour récupérer le cantique
4. **Modifier les champs** souhaités (titre, clé, contenu, auteur, catégories)
5. **Cliquer sur "Enregistrer"** pour sauvegarder
6. **Message de confirmation** s'affiche, puis le formulaire se réinitialise automatiquement

## Structure des bases de données

### cantique.db (Cantiques Adventistes - Malagasy)
- Table: `adventiste_cantique`
- Champs: `c_num`, `c_title`, `c_key`, `c_content`, `C_author`, `c_categories`

### humnes&louanges.db (Hymnes et Louanges - Français)
- Même structure que cantique.db

## API Endpoints

### GET /api/cantique/{database}/{number}
Récupère un cantique spécifique
- Exemple: `/api/cantique/cantique.db/182`

### PUT /api/cantique/{database}/{number}
Met à jour un cantique spécifique
- Body: JSON avec les champs à modifier

## Prérequis
- Python 3
- Navigateur web moderne
- Les bases de données doivent être dans le dossier `hymnes/`

## Sécurité
- Le serveur fonctionne localement (localhost:8080)
- Aucune donnée n'est envoyée sur internet
- Modifications directes dans les fichiers SQLite locaux

## Dépannage
- **"Base de données non trouvée"**: Vérifiez que les fichiers .db sont dans le dossier `hymnes/`
- **"Cantique non trouvé"**: Vérifiez que le numéro existe dans la base sélectionnée
- **Serveur ne démarre pas**: Vérifiez que le port 8080 n'est pas utilisé par une autre application
