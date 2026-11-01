# Journal des modifications (Changelog)

Toutes les modifications notables apportées à ce projet seront documentées dans ce fichier.

## [1.3.6] - 2026-11-01

### ✨ Nouveautés
- *École du sabbat* : Les **langues disponibles sont désormais lues depuis le serveur** — 95 langues au lieu de 3 pour les leçons et 6 pour l'audio et la vidéo. Chaque langue s'affiche dans sa propre écriture (中文, አማርኛ, Kiswahili…), le malgache, le français et l'anglais restent en tête de liste, et un champ de recherche permet de trouver sa langue sans faire défiler. Une langue ajoutée sur le serveur apparaît sans mise à jour de l'application.
- *Mofon'aina* : Le livret publie pour chaque jour le **Diabe**, le **Velomin'ny teniny** et l'**heure du coucher du soleil** des sabbats. Ces informations étaient téléchargées mais n'étaient affichées nulle part ; elles apparaissent maintenant en une ligne discrète sous le verset du jour. Le Diabe s'ouvre d'un appui dans la Bible.
- *Mofon'aina* : Le **jour de la semaine du livret** est affiché tel qu'il est publié. « Sabata » s'affiche enfin « Sabata » au lieu de « Saturday ».

### 🐛 Corrections
- *École du sabbat* : Hors-ligne et dans une langue jamais encore synchronisée, le filtre du haut affichait les catégories **malgaches** quelle que soit la langue choisie. Il n'affiche plus de catégorie inventée.
- *École du sabbat (audio et vidéo)* : Une langue sans contenu publié affichait « Aucun résultat », impossible à distinguer d'un filtre trop restrictif. Un message clair invite désormais à changer de langue.
- *École du sabbat* : Si le serveur principal ne répond pas, l'application bascule sur le serveur miroir pour **toutes** les langues, et non plus seulement pour l'anglais.

### 🔧 Technique
- *Mofon'aina* : Les méditations ne sont plus relues et réanalysées depuis le disque à chaque appel (environ 450 Ko, plusieurs fois par ouverture d'écran). Elles sont gardées en mémoire avec un index par date, et le cache est invalidé dès que le widget réécrit le fichier depuis son propre processus.
- Suppression de l'ancien écran de leçons `lesona_v1` (1 900 lignes), restée accessible comme route et porteuse de sa propre liste de langues figée.

---

## [1.3.5] - 2026-10-19

### 🐛 Corrections
- *École du sabbat (Malagasy)* : Le filtre du haut utilise désormais les **catégories réellement publiées** (« Lesona Lehibe », « Lesona Tanora Zokiny », etc.) au lieu d'une liste fixe. Il ne mélange plus toutes les classes dans « Lesona Lehibe » : une classe qui n'existe pas dans les leçons disponibles affiche « Tout » plutôt qu'un contenu qui ne lui correspond pas.
- *École du sabbat* : La **classe EDS** des paramètres est maintenant alimentée par les mêmes catégories que l'écran des leçons. Choisir une classe ouvre directement le bon filtre, et les anciennes valeurs (ex. « Lesona Lehibe (+ 35 taona) », « Lesona Tanora zokiny (19-35 taona) ») sont reconnues et migrées.
- *École du sabbat* : Les **titres des leçons** se rafraîchissent réellement. Le cache est désormais propre à chaque trimestre (plus de titre d'un trimestre affiché sur un autre), il expire au bout de 6 heures, et le bouton de rafraîchissement force la mise à jour des titres. Un appui sur le bouton depuis un trimestre ouvert le rafraîchit sans quitter la page.

### ✨ Améliorations
- *Mofon'aina* : La liste du trimestre s'ouvre sur la méditation du jour, puis les jours suivants, au lieu de démarrer au premier jour du livret. La liste reste entièrement défilable (mois précédents et suivants).

---

## [1.3.4] - 2026-09-29

### ✨ Nouveautés
- *Mofon'aina* : Ajout du **4ᵉ trimestre 2026** — « Ny Fanjakan'ny Lanitra », 91 méditations du 27 septembre au 26 décembre, avec pour chaque jour le psaume, le plan de lecture et l'heure du coucher du soleil des sabbats.
- *Mofon'aina* : Les nouveaux trimestres publiés sont désormais **détectés automatiquement**. Plus besoin de mettre à jour l'application pour recevoir un nouveau livret.

### 🐛 Corrections
- *Mofon'aina* : La lecture du jour était introuvable lorsque le livret et le trimestre calendaire ne coïncidaient pas — c'était le cas du 27 au 30 septembre, le livret du 4ᵉ trimestre commençant avant octobre.
- *École du sabbat* : Un trimestre téléchargé alors que toutes ses leçons n'étaient pas encore publiées restait figé. Le bouton de rafraîchissement ne relançait rien s'il avait déjà synchronisé dans la journée, et il fallait tout supprimer pour récupérer les leçons manquantes.
- *École du sabbat* : Une **mise à jour** récupère maintenant uniquement les leçons parues depuis le dernier téléchargement, sans retélécharger celles déjà présentes ni perdre vos surlignages. La carte du trimestre affiche l'avancement (par exemple « 9/13 leçons »).
- *École du sabbat* : Une coupure de connexion en cours de téléchargement ne fait plus tout perdre ; la mise à jour suivante reprend là où elle s'était arrêtée.
- *École du sabbat* : La suppression d'un trimestre efface désormais réellement tous ses fichiers, et l'espace occupé affiché est correct.

### 🔧 Technique
- Première version signée avec la clé officielle d'Adventools (voir l'avertissement ci-dessous).
- Les APK sont désormais construits et publiés par GitHub Actions.

---

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
