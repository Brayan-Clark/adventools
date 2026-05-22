# Journal des modifications (Changelog)

Toutes les modifications notables apportées à ce projet seront documentées dans ce fichier.

## [1.3.0] - 2026-05-22

### ✨ Nouveautés & UX
- *Bible (Lecture)* : La sélection d'un verset pour afficher les options de surlignage/partage se fait désormais via un **appui long** (au lieu d'un appui simple) pour éviter les clics accidentels lors de la lecture.
- *Notes (Design)* : Amélioration drastique du rendu **Markdown**. Les listes, textes en gras, italiques et l'alignement des textes sont désormais parfaitement compatibles et s'affichent correctement sans briser le style des notes.
- *Paramètres (Notifications)* : Le choix de la durée de l'avertissement "Avant l'heure d'étude" (ex: 5 minutes avant, 10 minutes avant) s'affiche désormais dans une magnifique fenêtre Modale intuitive, au lieu du système d'alerte Android classique.

### 🔧 Technique & Corrections
- *Fiabilité des Notifications Android* : Résolution majeure du système de notification de rappel de l'École du Sabbat. 
  - Ajout des permissions système `SCHEDULE_EXACT_ALARM` et `USE_EXACT_ALARM` pour s'assurer qu'Android respecte les alarmes exactes malgré les modes d'économie d'énergie (Doze mode).
  - Correction du bug où les notifications se déclenchaient "toutes en même temps" à l'ouverture de l'application. L'application ne force plus la recréation des tâches en arrière-plan si elles sont déjà bien programmées.
- Mise à jour de la version de l'application vers *1.3.0*.

---

## [1.2.1] - 2026-04-27

### ✨ Nouveautés (Hymnes & Cantiques)
- *Mélodies Similaires* : Ajout d'une fonctionnalité permettant de voir tous les chants utilisant la même mélodie. Un bouton dédié apparaît désormais sur la page du chant.
- *Pavé Numérique Premium* : Remplacement du clavier système par un pavé numérique personnalisé et stylisé pour une recherche de chants plus rapide et intuitive.
- *Aperçu en Temps Réel* : Le titre du chant s'affiche instantanément pendant que vous tapez le numéro sur le pavé numérique.

### 📄 Améliorations du Lecteur PDF
- *Mémorisation de la Page* : L'application retient désormais votre position de lecture. À la réouverture d'un document, vous revenez exactement là où vous vous étiez arrêté.
* *Navigation Optimisée* : Refonte du bouton de changement de page pour le rendre plus visible et explicite.
- *Historique Global* : Les documents PDF consultés apparaissent maintenant dans la liste des "Lectures récentes" sur la page d'accueil.

### 🎨 Design & UX
- *Lisibilité* : Augmentation de la taille de la police pour le numéro du chant (ex: "CANTIQUE 123") et meilleur centrage des éléments.
- *Fluidité* : Optimisation des transitions et des délais de chargement pour un ressenti plus "Premium".

### 🔧 Technique
- Mise à jour de la version de l'application vers *1.2.1*.
- Incrémentation du *versionCode* à *5* pour le déploiement Android.
- Correction du système de migration de la base de données des cantiques.
