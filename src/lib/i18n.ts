import type { Lang } from './types';

const dict = {
  nav_home: { fr: 'Accueil', mg: 'Fandraisana' },
  nav_sermons: { fr: 'Sermons', mg: 'Toriteny' },
  nav_courses: { fr: 'Cours', mg: 'Fampianarana' },
  nav_audio: { fr: 'Audio', mg: 'Feo' },
  nav_seminars: { fr: 'Séminaires', mg: 'Seminera' },
  nav_conferences: { fr: 'Conférences', mg: 'Kôferansa' },
  nav_articles: { fr: 'Articles', mg: 'Lahatsoratra' },
  nav_cantiques: { fr: 'Cantiques', mg: 'Fihirana' },
  nav_mofonaina: { fr: 'Mofonaina', mg: 'Mofonaina' },
  nav_assistant: { fr: 'Assistant IA', mg: 'Mpanampy IA' },
  nav_admin: { fr: 'Admin', mg: 'Admin' },
  nav_presentation: { fr: 'Présentation', mg: 'Fampisehoana' },
  nav_documents: { fr: 'Bibliothèque', mg: 'Tranomboky' },
  nav_about: { fr: 'À propos', mg: 'Momba anay' },
  nav_menu: { fr: 'Menu', mg: 'Menu' },
  nav_group_watch: { fr: 'Vidéos', mg: 'Horonan-tsary' },
  nav_group_listen: { fr: 'Écoute', mg: 'Feo' },
  nav_group_study: { fr: 'Études', mg: 'Fianarana' },

  search_placeholder: { fr: 'Rechercher sermons, cours…', mg: 'Karohy toriteny, fampianarana…' },
  search_button: { fr: 'Rechercher', mg: 'Karohy' },
  search_no_results: { fr: 'Aucun résultat trouvé.', mg: 'Tsy misy valiny.' },
  search_results_for: { fr: 'Résultats pour', mg: 'Valiny ho an’ny' },
  search_all: { fr: 'Tout', mg: 'Rehetra' },

  hero_badge: { fr: 'Plateforme d’étude publique', mg: 'Sehatra fianarana ho an’ny rehetra' },
  hero_title: { fr: 'Andeaha Hizaha', mg: 'Andeaha Hizaha' },
  hero_subtitle: {
    fr: 'Sermons vidéo, cours bibliques, audio & séminaires pour grandir ensemble dans la foi.',
    mg: 'Toriteny, fampianarana, feo ary seminera hihalehibe miaraka amin’ny finoana.',
  },
  hero_cta_sermons: { fr: 'Explorer les sermons', mg: 'Hijery toriteny' },
  hero_cta_ai: { fr: 'Parlons à l’assistant IA', mg: 'Miresaha amin’ny mpanampy IA' },
  verse_of_day: { fr: 'Verset du jour', mg: 'Andininy androany' },

  stat_sermons: { fr: 'Sermons vidéo', mg: 'Toriteny' },
  stat_courses: { fr: 'Cours & leçons', mg: 'Fampianarana' },
  stat_audio: { fr: 'Écoute audio', mg: 'Feo' },
  stat_seminars: { fr: 'Séminaires', mg: 'Seminera' },
  stat_conferences: { fr: 'Conférences', mg: 'Kôferansa' },
  stat_articles: { fr: 'Articles écrits', mg: 'Lahatsoratra' },

  featured: { fr: 'En vedette', mg: 'Nasongadina' },
  latest_sermons: { fr: 'Derniers sermons', mg: 'Toriteny farany' },
  courses_section: { fr: 'Cours bibliques', mg: 'Fampianarana Baiboly' },
  audio_section: { fr: 'Audio & méditations', mg: 'Feo sy fisaintsainana' },
  seminars_section: { fr: 'Séminaires & événements', mg: 'Seminera sy hetsika' },
  conferences_section: { fr: 'Conférences', mg: 'Kôferansa' },
  articles_section: { fr: 'Articles & études', mg: 'Lahatsoratra sy fianarana' },
  cantiques_section: { fr: 'Cantiques & hymnes', mg: 'Fihirana sy hira' },
  mofonaina_section: { fr: 'Mofonaina — Méditations', mg: 'Mofonaina — Fisaintsainana' },
  categories_section: { fr: 'Parcourir par catégorie', mg: 'Fikarohana araka ny sokajy' },
  view_all: { fr: 'Voir tout', mg: 'Jereo daholo' },
  view_more: { fr: 'Voir plus', mg: 'Jereo bebe kokoa' },

  watch: { fr: 'Regarder', mg: 'Hijery' },
  listen: { fr: 'Écouter', mg: 'Hihaino' },
  read: { fr: 'Consulter', mg: 'Hijery' },
  minutes: { fr: 'min', mg: 'mn' },
  lessons: { fr: 'leçons', mg: 'lesona' },
  sessions: { fr: 'sessions', mg: 'fivoriana' },
  speaker: { fr: 'Prédicateur', mg: 'Mpitory' },
  reading_time: { fr: 'min de lecture', mg: 'min vakiana' },
  by_speaker: { fr: 'par', mg: 'nataon’i' },
  views: { fr: 'vues', mg: 'fijerena' },
  tags: { fr: 'Mots-clés', mg: 'Teny fanalahidy' },
  related: { fr: 'À découvrir aussi', mg: 'Jereo koa' },
  no_description: { fr: 'Description à venir.', mg: 'Ho avy ny famaritana.' },
  not_found_title: { fr: 'Page introuvable', mg: 'Tsy hita ny pejy' },
  not_found_text: {
    fr: 'Le contenu que vous cherchez n’existe pas ou a été déplacé.',
    mg: 'Tsy misy intsony ny zavatra tadiavinao.',
  },
  back_home: { fr: 'Retour à l’accueil', mg: 'Miverina any an-trano' },

  ai_title: { fr: 'Assistant d’étude Andeaha', mg: 'Mpanampy fianarana Andeaha' },
  ai_subtitle: {
    fr: 'Posez vos questions bibliques, obtenez des recommandations de sermons et de cours.',
    mg: 'Manontania momba ny Baiboly, mahazoa soso-kevitra toriteny sy fampianarana.',
  },
  ai_placeholder: { fr: 'Écrivez votre question…', mg: 'Soraty ny fanontanianao…' },
  ai_send: { fr: 'Envoyer', mg: 'Alefaso' },
  ai_thinking: { fr: 'Réflexion en cours…', mg: 'Mieritreritra…' },
  ai_clear: { fr: 'Effacer la conversation', mg: 'Fafao ny resaka' },
  ai_powered: { fr: 'Propulsé par Puter.js', mg: 'Ampandehanin’ny Puter.js' },
  ai_tab_chat: { fr: 'Discuter', mg: 'Resaka' },
  ai_tab_image: { fr: 'Créer une image', mg: 'Hamorona sary' },
  ai_tab_audio: { fr: 'Écouter (audio)', mg: 'Hihaino (feo)' },
  ai_signin_title: { fr: 'Connexion requise', mg: 'Ilaina ny fidirana' },
  ai_signin_text: {
    fr: 'Connectez-vous avec votre adresse e-mail ou votre compte Google (via Puter) pour discuter avec l’IA, générer des images et écouter du contenu.',
    mg: 'Midira amin’ny mailaka na kaonty Google (amin’ny alalan’ny Puter) mba hiresaka amin’ny IA, hamorona sary ary hihaino votoaty.',
  },
  ai_signin_btn: { fr: 'Se connecter', mg: 'Hiditra' },
  ai_signed_as: { fr: 'Connecté en tant que', mg: 'Tafiditra amin’ny maha' },
  ai_signout: { fr: 'Déconnexion', mg: 'Hiala' },
  ai_model: { fr: 'Modèle', mg: 'Modely' },
  ai_image_placeholder: {
    fr: 'Décrivez l’image à générer… (ex : une colombe au-dessus d’une Bible ouverte)',
    mg: 'Hazavao ny sary tianao hoforonina… (ohatra : voromailala eo ambonin’ny Baiboly misokatra)',
  },
  ai_image_btn: { fr: 'Générer l’image', mg: 'Hamorona sary' },
  ai_image_hint: {
    fr: 'L’IA crée une illustration à partir de votre description. La connexion est nécessaire.',
    mg: 'Ny IA dia mamorona sary avy amin’ny famaritanao. Ilaina ny fidirana.',
  },
  ai_image_ratio: { fr: 'Format', mg: 'Fizarana' },
  ai_ratio_square: { fr: 'Carré', mg: 'Efadrefa' },
  ai_ratio_landscape: { fr: 'Paysage', mg: 'Marindrano' },
  ai_ratio_portrait: { fr: 'Portrait', mg: 'Mitsangana' },
  ai_image_generating: { fr: 'Génération en cours…', mg: 'Amin’ny famoronana…' },
  ai_image_download: { fr: 'Télécharger', mg: 'Ampidino' },
  ai_audio_placeholder: {
    fr: 'Texte à écouter… (verset, prière, note)',
    mg: 'Lahatsoratra hihainoana… (andininy, vavaka, fanamarihana)',
  },
  ai_audio_btn: { fr: 'Écouter', mg: 'Hihaino' },
  ai_audio_hint: {
    fr: 'L’IA lit votre texte à voix haute (synthèse vocale). La connexion est nécessaire.',
    mg: 'Vakian’ny IA mafy ny lahatsoratrao (feo sintetika). Ilaina ny fidirana.',
  },
  ai_audio_generating: { fr: 'Préparation de l’audio…', mg: 'Amin’ny fanomanana ny feo…' },
  ai_error_signin: { fr: 'Connexion annulée ou impossible. Réessayez.', mg: 'Nofoanana na tsy nahomby ny fidirana. Andramo indray.' },
  ai_modal_title: { fr: 'Connectez-vous pour utiliser l’IA', mg: 'Midira mba hampiasa ny IA' },
  ai_modal_text: {
    fr: 'Le chat, la création d’images et l’audio nécessitent un compte gratuit. Connectez-vous avec votre e-mail ou votre compte Google — c’est rapide et sécurisé via Puter.',
    mg: 'Mila kaonty maimaimpoana ny resaka, ny famoronana sary ary ny feo. Midira amin’ny mailaka na kaonty Google — haingana sy azo antoka amin’ny alalan’ny Puter izany.',
  },
  ai_modal_btn: { fr: 'Se connecter maintenant', mg: 'Midira izao' },
  ai_modal_later: { fr: 'Plus tard', mg: 'Avy eo' },
  ai_modal_retry: {
    fr: 'Après connexion, votre message sera envoyé automatiquement.',
    mg: 'Aorian’ny fidirana dia halefa ho azy ny hafatrao.',
  },
  ai_welcome_title: { fr: 'Bienvenue !', mg: 'Tonga soa !' },
  ai_welcome_text: {
    fr: 'Posez vos questions bibliques, créez des images et écoutez du contenu. Connectez-vous pour commencer.',
    mg: 'Manontania momba ny Baiboly, mamorona sary ary mihaino votoaty. Midira mba hanomboka.',
  },

  nav_bible: { fr: 'Bible', mg: 'Baiboly' },

  cantiques_subtitle: {
    fr: 'Cantiques adventistes et hymnes de louange, avec paroles et audio.',
    mg: 'Fihirana adventista sy hira fiderana, miaraka amin’ny tononkira sy feo.',
  },
  cantiques_mg: { fr: 'Malgache', mg: 'Gasy' },
  cantiques_fr: { fr: 'Français', mg: 'Frantsay' },
  cantiques_en: { fr: 'English (SDA Hymnal)', mg: 'English (SDA Hymnal)' },
  cantiques_by_number: { fr: 'Par numéro', mg: 'Araka ny laharana' },
  cantique_no_lyrics: {
    fr: 'Paroles non disponibles — écoutez l’audio ci-dessous.',
    mg: 'Tsy misy ny tononkira — henoy ny feo etsy ambany.',
  },

  bible_subtitle: {
    fr: 'Lisez la Bible en 23 versions : malgache (1865, DIEM…), français (Fillion, Louis Segond…), anglais, arabe et plus encore.',
    mg: 'Vakio ny Baiboly amin’ny dikan-teny 23 : Malagasy (1865, DIEM…), frantsay (Fillion, Louis Segond…), anglisy, arabo ary hafa.',
  },
  bible_choose_version: { fr: 'Version', mg: 'Dikan-teny' },
  bible_ot: { fr: 'Ancien Testament', mg: 'Testamenta Taloha' },
  bible_nt: { fr: 'Nouveau Testament', mg: 'Testamenta Vaovao' },
  bible_apocrypha: { fr: 'Deutérocannoniques', mg: 'Deoterokanônika' },
  bible_books: { fr: 'Livres', mg: 'Boky' },
  bible_chapters: { fr: 'Chapitres', mg: 'Tokom-bo' },
  bible_prev_chapter: { fr: 'Chapitre précédent', mg: 'Tokom-bo teo aloha' },
  bible_next_chapter: { fr: 'Chapitre suivant', mg: 'Tokom-bo manaraka' },
  bible_copy: { fr: 'Copier', mg: 'Adikao' },
  bible_copied: { fr: 'Copié ✓', mg: 'Voasoratra ✓' },
  bible_loading: { fr: 'Chargement…', mg: 'Am-panangonana…' },
  bible_error: { fr: 'Erreur de chargement. Réessayez.', mg: 'Tsy nahomby ny famakiana. Andramo indray.' },
  bible_select_book: { fr: 'Choisissez un livre', mg: 'Misafidia boky' },
  bible_section: { fr: 'La Bible — Lire en plusieurs versions', mg: 'Ny Baiboly — Vakio amin’ny dikan-teny maro' },
  bible_verses_label: { fr: 'versets', mg: 'andininy' },
  bible_open_reader: { fr: 'Ouvrir le lecteur', mg: 'Sokafy ny famakiana' },
  bible_search_placeholder: {
    fr: 'Recherche rapide — ex : Jao.3:16, Genèse 1:1, ou un mot…',
    mg: 'Fikarohana haingana — ohatra : Jao.3:16, Genesisy 1:1, na teny…',
  },
  bible_search_button: { fr: 'Rechercher', mg: 'Karohy' },
  bible_search_hint: {
    fr: 'Tapez une référence (Jao.3:16, Genèse 1:1, Jao.3:16-20) ou un mot-clé (foi, amour…).',
    mg: 'Soraty referansy (Jao.3:16, Genesisy 1:1, Jao.3:16-20) na teny (finoana, fitiavana…).',
  },
  bible_search_found: { fr: 'Référence trouvée', mg: 'Hita ny referansy' },
  bible_search_results: { fr: 'résultat(s)', mg: 'valiny' },
  bible_search_no_results: { fr: 'Aucun résultat pour', mg: 'Tsy misy valiny ho an’ny' },
  bible_search_recent: { fr: 'Recherches récentes', mg: 'Fikarohana vao tsy ela' },
  bible_search_clear: { fr: 'Effacer', mg: 'Fafao' },
  cantique_number: { fr: 'Cantique', mg: 'Fihirana' },
  cantique_key: { fr: 'Tonalité', mg: 'Feon-kira' },
  cantique_listen: { fr: 'Écouter l’audio', mg: 'Hihaino ny feo' },
  cantique_no_audio: { fr: 'Audio non disponible', mg: 'Tsy misy feo' },
  cantique_search: { fr: 'Rechercher un cantique…', mg: 'Karohy fihirana…' },
  cantiques_total: { fr: 'cantiques', mg: 'fihirana' },
  with_audio: { fr: 'avec audio', mg: 'misy feo' },
  source: { fr: 'Source', mg: 'Loharano' },

  mofonaina_subtitle: {
    fr: 'La méditation quotidienne de l’Esprit de Prophétie pour nourrir votre journée.',
    mg: 'Ny fisaintsainana isan’andro avy amin’ny Fanahin’ny Faminaniana hanome hery ny andronao.',
  },
  mofonaina_today: { fr: 'Méditation du jour', mg: 'Fisaintsainana androany' },
  mofonaina_date: { fr: 'Date', mg: 'Daty' },
  mofonaina_verse: { fr: 'Verset du jour', mg: 'Andininy androany' },
  mofonaina_quarter: { fr: 'Trimestre', mg: 'Telovolana' },
  mofonaina_prev: { fr: 'Précédent', mg: 'Teo aloha' },
  mofonaina_next: { fr: 'Suivant', mg: 'Manaraka' },
  mofonaina_by_date: { fr: 'Par date', mg: 'Araka ny daty' },
  mofonaina_search_hint: {
    fr: 'Choisissez une date pour retrouver la méditation de ce jour-là.',
    mg: 'Misafidia daty mba hahitana ny fisaintsainana tamin’io andro io.',
  },
  mofonaina_range: {
    fr: 'méditations disponibles',
    mg: 'fisaintsainana misy',
  },
  ai_offline_title: { fr: 'Mode hors-ligne', mg: 'Fomba tsy misy aterineto' },
  ai_offline_text: {
    fr: 'Connexion Internet requise pour l’IA. Vous pouvez parcourir le contenu mis en cache.',
    mg: 'Mila aterineto ny IA. Afaka mijery ny votoaty voatahiry ianao.',
  },
  ai_suggestion_1: { fr: 'Recommande-moi un sermon sur la foi', mg: 'Omeo toriteny momba ny finoana aho' },
  ai_suggestion_2: { fr: 'Quel cours pour débuter la Bible ?', mg: 'Inona ny fampianarana hanombohana ny Baiboly ?' },
  ai_suggestion_3: { fr: 'Que dit la Bible sur la prière ?', mg: 'Inona no lazain’ny Baiboly momba ny vavaka ?' },

  footer_about_title: { fr: 'À propos', mg: 'Momba anay' },
  footer_about_text: {
    fr: 'Andeaha Hizaha est une plateforme publique d’étude de la Parole : sermons, cours, audio et séminaires, accessible partout, même hors-ligne.',
    mg: 'Andeaha Hizaha dia sehatra fianarana ny Tenin’Andriamanitra : toriteny, fampianarana, feo ary seminera, azo idirana na aiza na aiza.',
  },
  footer_links_title: { fr: 'Navigation', mg: 'Fitetezana' },
  footer_contact_title: { fr: 'Contact', mg: 'Fifandraisana' },
  footer_rights: { fr: 'Tous droits réservés.', mg: 'Zo rehetra voatokana.' },
  footer_made: { fr: 'Fait avec foi, à Madagascar', mg: 'Vita amin’ny finoana, eto Madagasikara' },
  install_app: { fr: 'Installer l’application', mg: 'Ampidiro ny app' },
  install_app_desc: {
    fr: 'Installez Andeaha Hizaha sur votre appareil pour l’utiliser hors-ligne.',
    mg: 'Ampidiro ny Andeaha Hizaha amin’ny fitaovanao mba hampiasaina tsy misy aterineto.',
  },
  offline_title: { fr: 'Vous êtes hors-ligne', mg: 'Tsy misy aterineto ianao' },
  offline_text: {
    fr: 'Le contenu que vous avez consulté reste disponible. Reconnectez-vous pour tout le catalogue.',
    mg: 'Mbola azo jerena ny zavatra nodinihinao. Miverena amin’ny aterineto mba hahitana ny rehetra.',
  },
  retry: { fr: 'Réessayer', mg: 'Andramo indray' },
  back_to_content: { fr: 'Contenu mis en cache', mg: 'Votoaty voatahiry' },

  admin_login_title: { fr: 'Espace administrateur', mg: 'Sehatra mpitantana' },
  admin_password: { fr: 'Mot de passe', mg: 'Teny miafina' },
  admin_login: { fr: 'Se connecter', mg: 'Hiditra' },
  admin_wrong: { fr: 'Mot de passe incorrect', mg: 'Diso ny teny miafina' },
  admin_logout: { fr: 'Déconnexion', mg: 'Hiala' },
  admin_dashboard: { fr: 'Tableau de bord', mg: 'Tabilao' },
  admin_add: { fr: 'Ajouter un contenu', mg: 'Hanampy votoaty' },
  admin_type: { fr: 'Type', mg: 'Karazana' },
  admin_title_fr: { fr: 'Titre (français)', mg: 'Lohateny (frantsay)' },
  admin_title_mg: { fr: 'Titre (malgache)', mg: 'Lohateny (gasy)' },
  admin_desc_fr: { fr: 'Description (français)', mg: 'Famaritana (frantsay)' },
  admin_desc_mg: { fr: 'Description (malgache)', mg: 'Famaritana (gasy)' },
  admin_speaker: { fr: 'Prédicateur / Auteur', mg: 'Mpitory / Mpanoratra' },
  admin_category: { fr: 'Catégorie', mg: 'Sokajy' },
  admin_image: { fr: 'Image (URL ou fichier)', mg: 'Sary (URL na rakitra)' },
  admin_video: { fr: 'Vidéo (URL ou fichier)', mg: 'Horonan-tsary (URL na rakitra)' },
  admin_audio: { fr: 'Audio (URL ou fichier)', mg: 'Feo (URL na rakitra)' },
  admin_duration: { fr: 'Durée', mg: 'Faharetan’ny fotoana' },
  admin_date: { fr: 'Date', mg: 'Daty' },
  admin_tags: { fr: 'Mots-clés (séparés par des virgules)', mg: 'Teny fanalahidy (mizarazara amin’ny faingo)' },
  admin_featured: { fr: 'Mettre en vedette', mg: 'Hasongadina' },
  admin_lessons: { fr: 'Leçons du cours', mg: 'Lesona' },
  admin_sessions: { fr: 'Sessions de la conférence (vidéo / audio)', mg: 'Fivoriana ao amin’ny kôferansa (sary / feo)' },
  admin_lesson_title_fr: { fr: 'Leçon – titre (FR)', mg: 'Lesona – lohateny (FR)' },
  admin_lesson_title_mg: { fr: 'Leçon – titre (MG)', mg: 'Lesona – lohateny (MG)' },
  admin_lesson_video: { fr: 'Leçon – vidéo (URL)', mg: 'Lesona – horonan-tsary (URL)' },
  admin_lesson_audio: { fr: 'Leçon – audio (URL)', mg: 'Lesona – feo (URL)' },
  admin_lesson_duration: { fr: 'Leçon – durée', mg: 'Lesona – fotoana' },
  admin_add_lesson: { fr: '+ Ajouter une leçon', mg: '+ Hanampy lesona' },
  admin_add_session: { fr: '+ Ajouter une session', mg: '+ Hanampy fivoriana' },
  admin_content_fr: { fr: 'Contenu de l’article (français)', mg: 'Votoatin’ny lahatsoratra (frantsay)' },
  admin_content_mg: { fr: 'Contenu de l’article (malgache)', mg: 'Votoatin’ny lahatsoratra (gasy)' },
  admin_content_hint: {
    fr: 'Rédigez le texte avec des retours à la ligne. Les lignes vides créent des paragraphes ; les lignes commençant par ## sont des sous-titres.',
    mg: 'Soraty ny lahatsoratra misy tsiroaroa. Ny andalana foana dia manao paragrafy ; ny andalana manomboka amin’ny ## dia lohateny kely.',
  },
  admin_save: { fr: 'Enregistrer', mg: 'Tehirizo' },
  admin_saved: { fr: 'Contenu enregistré ✓', mg: 'Voatahiry ny votoaty ✓' },
  admin_delete: { fr: 'Supprimer', mg: 'Fafao' },
  admin_edit: { fr: 'Modifier', mg: 'Ovay' },
  admin_existing: { fr: 'Contenus existants', mg: 'Votoaty efa misy' },
  admin_upload_hint: { fr: 'Collez une URL ou choisissez un fichier (vidéo, audio, image).', mg: 'Apetraho URL na misafidiana rakitra.' },
  admin_uploading: { fr: 'Envoi…', mg: 'Mandefa…' },
  type_sermon: { fr: 'Sermon vidéo', mg: 'Toriteny' },
  type_course: { fr: 'Cours', mg: 'Fampianarana' },
  type_audio: { fr: 'Audio', mg: 'Feo' },
  type_seminar: { fr: 'Séminaire', mg: 'Seminera' },
  type_conference: { fr: 'Conférence', mg: 'Kôferansa' },
  type_article: { fr: 'Article', mg: 'Lahatsoratra' },

  pres_title: { fr: 'Studio de présentation', mg: 'Trano fanomanana fampisehoana' },
  pres_subtitle: {
    fr: 'Composez un ordre de culte — cantiques, versets bibliques, annonces — et projetez-le en plein écran, comme VideoPsalm.',
    mg: 'Mamorona fandaharana fivavahana — fihirana, andininy, filazana — ary asehoy amin’ny efijery feno, toy ny VideoPsalm.',
  },
  pres_launch: { fr: '🖥️ Lancer la projection', mg: '🖥️ Asehoy' },
  pres_presentations: { fr: 'Mes présentations', mg: 'Fampisehoako' },
  pres_new: { fr: '+ Nouvelle présentation', mg: '+ Fampisehoana vaovao' },
  pres_delete: { fr: 'Supprimer', mg: 'Hamafa' },
  pres_duplicate: { fr: 'Dupliquer', mg: 'Handika' },
  pres_name_placeholder: { fr: 'Nom de la présentation…', mg: 'Anaran’ny fampisehoana…' },
  pres_items: { fr: 'Éléments du culte', mg: 'Singa ao amin’ny fivavahana' },
  pres_empty: {
    fr: 'Aucun élément — ajoutez un cantique, un verset, une annonce ou une image.',
    mg: 'Tsy misy singa — asio fihirana, andininy, filazana na sary.',
  },
  pres_add_cantique: { fr: '🎵 Cantique', mg: '🎵 Fihirana' },
  pres_add_bible: { fr: '📖 Verset biblique', mg: '📖 Andininy' },
  pres_add_text: { fr: '📝 Annonce / Texte', mg: '📝 Filazana / Soratra' },
  pres_add_image: { fr: '🖼️ Image de fond', mg: '🖼️ Sary fototra' },
  pres_search_cantique: {
    fr: 'Rechercher un cantique par numéro ou titre…',
    mg: 'Karohy fihirana amin’ny laharana na lohateny…',
  },
  pres_search_results: { fr: 'résultat(s)', mg: 'valiny' },
  pres_bible_ref_placeholder: {
    fr: 'Référence — ex : Jao.3:16, Salamo 23…',
    mg: 'Referansy — ohatra : Jao.3:16, Salamo 23…',
  },
  pres_text_title: { fr: 'Titre de l’annonce', mg: 'Lohatenin’ny filazana' },
  pres_text_body: { fr: 'Contenu (une ligne par ligne affichée)', mg: 'Votoaty (andalan-tsoratra isaky ny tsiroaroa)' },
  pres_image_url: { fr: 'URL de l’image (fond)', mg: 'URL-ny sary (fototra)' },
  pres_image_caption: { fr: 'Légende (optionnel)', mg: 'Sokajy (tsi-voatery)' },
  pres_image_local: { fr: 'Fichier local…', mg: 'Rakitra eo an-toerana…' },
  pres_added: { fr: 'Ajouté !', mg: 'Nampidirina !' },
  pres_settings: { fr: 'Réglages d’affichage', mg: 'Fanamboarana fisehoana' },
  pres_bg: { fr: 'Fond', mg: 'Fototra' },
  pres_bg_presets: { fr: 'Dégradés', mg: 'Gradiant' },
  pres_bg_image: { fr: 'Image', mg: 'Sary' },
  pres_bg_solid: { fr: 'Couleur unie', mg: 'Loko iray' },
  pres_text_color: { fr: 'Couleur du texte', mg: 'Lokon’ny soratra' },
  pres_text_size: { fr: 'Taille du texte', mg: 'Haben’ny soratra' },
  pres_size_sm: { fr: 'Petite', mg: 'Kely' },
  pres_size_md: { fr: 'Moyenne', mg: 'Antoniny' },
  pres_size_lg: { fr: 'Grande', mg: 'Lehibe' },
  pres_size_xl: { fr: 'Très grande', mg: 'Tena lehibe' },
  pres_alignment: { fr: 'Alignement', mg: 'Firindrana' },
  pres_align_center: { fr: 'Centré', mg: 'Afovoany' },
  pres_align_left: { fr: 'Gauche', mg: 'Havia' },
  pres_verse_numbers: { fr: 'Numéros de versets', mg: 'Laharana andininy' },
  pres_auto_advance: { fr: 'Avance automatique (secondes, 0 = arrêt)', mg: 'Fandrosoana mandeha (segonina, 0 = tsy misy)' },
  pres_stanza: { fr: 'strophe', mg: 'andalan-kira' },
  pres_black_screen: { fr: 'Écran noir (B)', mg: 'Efijery mainty (B)' },
  pres_clock: { fr: 'Horloge', mg: 'Famantaranandro' },
  pres_prev: { fr: '← Précédent', mg: '← Teo aloha' },
  pres_next: { fr: 'Suivant →', mg: 'Manaraka →' },
  pres_add_hint: {
    fr: 'Vous pouvez aussi cliquer « Projeter » sur une page de cantique ou de Bible pour l’ajouter ici.',
    mg: 'Afaka manindry « Asehoy » amin’ny pejin’ny fihirana na Baiboly koa ianao mba hanampiana azy eto.',
  },
  pres_offline_ok: {
    fr: '✅ Fonctionne hors-ligne — vos présentations sont sauvegardées sur cet appareil.',
    mg: '✅ Miasa tsy misy aterineto — voatahiry eto amin’ity fitaovana ity ny fampisehoanao.',
  },

  // --- Bibliothèque de documents (PDF) -----------------------------------
  documents_subtitle: {
    fr: 'Manuels, études bibliques, livres de l’Esprit de Prophétie et documents de l’Église, à lire ou à projeter.',
    mg: 'Boky torolalana, fianarana Baiboly, bokin’ny Fanahin’ny Faminaniana ary antontan-taratasin’ny fiangonana, vakiana na aseho.',
  },
  documents_search: {
    fr: 'Rechercher un document, un auteur, une catégorie…',
    mg: 'Karohy antontan-taratasy, mpanoratra, sokajy…',
  },
  documents_total: { fr: 'documents', mg: 'antontan-taratasy' },
  documents_all: { fr: 'Tout', mg: 'Rehetra' },
  documents_empty: { fr: 'Aucun document trouvé.', mg: 'Tsy misy antontan-taratasy hita.' },
  documents_read: { fr: 'Lire', mg: 'Vakio' },
  documents_open: { fr: 'Ouvrir en grand', mg: 'Sokafy midadasika' },
  documents_download: { fr: 'Télécharger', mg: 'Ampidino' },
  documents_project: { fr: '🖥️ Projeter', mg: '🖥️ Asehoy' },
  documents_back: { fr: '← Retour à la bibliothèque', mg: '← Miverina any amin’ny tranomboky' },
  documents_loading: { fr: 'Chargement du document…', mg: 'Am-panangonana ny antontan-taratasy…' },
  documents_section: { fr: 'Bibliothèque de documents', mg: 'Tranomboky antontan-taratasy' },
  pres_add_doc: { fr: '📄 Document PDF', mg: '📄 Antontan-taratasy PDF' },
  pres_doc_hint: {
    fr: 'Choisissez un document de la bibliothèque à projeter (plein écran).',
    mg: 'Misafidia antontan-taratasy avy amin’ny tranomboky haseho (efijery feno).',
  },
  pres_advanced: { fr: 'Avancé', mg: 'Be kely' },
  pres_bg_url_or_color: {
    fr: 'URL image ou couleur (#hex)',
    mg: 'URL sary na loko (#hex)',
  },
  pres_add_video: { fr: '🎬 Vidéo', mg: '🎬 Lahatsary' },
  pres_video_url: {
    fr: 'URL de la vidéo — YouTube ou fichier mp4…',
    mg: 'URL-ny lahatsary — YouTube na rakitra mp4…',
  },
  pres_video_caption: { fr: 'Légende (optionnel)', mg: 'Sokajy (tsi-voatery)' },
  pres_video_hint: {
    fr: 'Collez un lien YouTube (ex : youtube.com/watch?v=…) ou un fichier mp4 pour la projeter plein écran.',
    mg: 'Apetraho rohy YouTube (ohatra : youtube.com/watch?v=…) na rakitra mp4 haseho amin’ny efijery feno.',
  },
  pres_add_audio: { fr: '🎧 Audio', mg: '🎧 Feo' },
  pres_audio_url: { fr: 'URL de l’audio — mp3, stream…', mg: 'URL-ny feo — mp3, stream…' },
  pres_audio_hint: {
    fr: 'Collez un lien audio (mp3, Google Drive…) — l’audio sera lisible pendant la projection.',
    mg: 'Apetraho rohy feo (mp3, Google Drive…) — hohenoina mandritra ny fampisehoana.',
  },
  pres_demo: { fr: '✨ Charger la démo', mg: '✨ Ento ny démo' },
  pres_demo_hint: {
    fr: 'Une présentation d’exemple avec tous les types de slides : texte, cantique, Bible, image, document, vidéo et audio.',
    mg: 'Fampisehoana ohatra misy ny karazana slides rehetra : soratra, fihirana, Baiboly, sary, antontan-taratasy, lahatsary ary feo.',
  },
  pres_demo_added: {
    fr: '✓ Présentation de démonstration chargée — lancez la projection !',
    mg: '✓ Voatsangana ny fampisehoana démo — atombohy ny fampisehoana !',
  },
  pres_tab_items: { fr: 'Éléments', mg: 'Singa' },
  pres_tab_add: { fr: 'Ajouter', mg: 'Hanampy' },
  // --- Modes de présentation (façon VideoPsalm) -----------------------------
  pres_mode_agenda: { fr: 'Agenda', mg: 'Fandaharana' },
  pres_mode_bible: { fr: 'Bible', mg: 'Baiboly' },
  pres_mode_cantique: { fr: 'Cantiques', mg: 'Fihirana' },
  pres_position: { fr: 'Position', mg: 'Toerana' },
  pres_pos_center: { fr: 'Centre', mg: 'Afovoany' },
  pres_pos_left: { fr: 'Gauche', mg: 'Havia' },
  pres_pos_right: { fr: 'Droite', mg: 'Havanana' },
  pres_pos_top: { fr: 'Haut', mg: 'Ambony' },
  pres_pos_bottom: { fr: 'Bas', mg: 'Ambany' },
  pres_customize: { fr: 'Personnaliser', mg: 'Manamboatra' },
  pres_item_settings_title: { fr: 'Personnalisation de l’élément', mg: 'Fanamboarana ny singa' },
  pres_apply: { fr: 'Appliquer', mg: 'Ampiharo' },
  pres_reset: { fr: 'Réinitialiser', mg: 'Averina' },
  pres_bible_mode_hint: {
    fr: 'Cherchez un verset (ex : Jao.3:16) puis naviguez avec ← → — chaque verset est projeté seul.',
    mg: 'Karohy andininy (ohatra : Jao.3:16) dia mivezivezy amin’ny ← → — andininy iray isaky ny aseho.',
  },
  pres_cantique_mode_hint: {
    fr: 'Cherchez un cantique par numéro ou titre, choisissez-le, puis naviguez entre les strophes.',
    mg: 'Karohy fihirana amin’ny laharana na lohateny, safidio, dia mivezivezy eo amin’ny andalan-kira.',
  },
  pres_search_song: { fr: 'Numéro ou titre du cantique…', mg: 'Laharana na lohatenin’ny fihirana…' },
  pres_choose_song: { fr: 'Choisissez un cantique', mg: 'Misafidia fihirana' },
  pres_present_verse: { fr: '🖥️ Projeter ce verset', mg: '🖥️ Asehoy ity andininy ity' },
  pres_present_cantique: { fr: '🖥️ Projeter le cantique', mg: '🖥️ Asehoy ny fihirana' },
  pres_present_agenda: { fr: '🖥️ Lancer la projection', mg: '🖥️ Asehoy' },
  pres_mode_settings_memo: {
    fr: 'Réglages mémorisés pour ce mode — changez de mode, ils sont conservés séparément.',
    mg: 'Tehirizina ny fanamboarana ho an’ity fomba ity — ovay ny fomba, mitokana ny tsirairay.',
  },
  pres_overlays: { fr: 'Superpositions', mg: 'Fampitambarana' },
  pres_clock_format: { fr: 'Format horloge', mg: 'Fomba famantaranandro' },
  pres_clock_fmt_hm: { fr: 'H:M', mg: 'H:M' },
  pres_clock_fmt_hms: { fr: 'H:M:S', mg: 'H:M:S' },
  pres_clock_fmt_hmd: { fr: 'H:M + date', mg: 'H:M + daty' },
  pres_clock_fmt_full: { fr: 'H:M:S + date', mg: 'H:M:S + daty' },
  pres_timer: { fr: 'Minuteur', mg: 'Timer' },
  pres_timer_seconds: { fr: 'Durée (secondes)', mg: 'Faharetana (segondra)' },
  pres_timer_off: { fr: 'Minuteur off', mg: 'Timer maty' },
  pres_timer_on: { fr: 'Minuteur on', mg: 'Timer velona' },
  pres_timer_reset: { fr: 'Réinitialiser', mg: 'Averina' },
  pres_ticker: { fr: 'Message défilant', mg: 'Hafatra mandeha' },
  pres_ticker_text: { fr: 'Texte (bas d’écran)', mg: 'Soratra (ambany efijery)' },
  pres_ticker_speed: { fr: 'Vitesse', mg: 'Haingana' },
  pres_bg_media: { fr: 'Fond média', mg: 'Fototra média' },
  pres_bg_media_none: { fr: 'Aucun', mg: 'Tsy misy' },
  pres_bg_media_image: { fr: '🖼️ Image', mg: '🖼️ Sary' },
  pres_bg_media_video: { fr: '🎬 Vidéo', mg: '🎬 Lahatsary' },
  pres_bg_media_url: { fr: 'URL du média (image ou vidéo)', mg: 'URL-ny média (sary na lahatsary)' },
  pres_help_timer: { fr: 'Minuteur (T — réinit. Maj+T)', mg: 'Timer (T — averina Maj+T)' },
  pres_help_ticker: { fr: 'Message défilant (M)', mg: 'Hafatra mandeha (M)' },
  pres_help_clock: { fr: 'Horloge (H — format Maj+H)', mg: 'Famantaranandro (H — fomba Maj+H)' },

  // --- À propos -----------------------------------------------------------
  about_badge: { fr: 'Venez et voyez', mg: 'Andeha hizaha' },
  about_title: { fr: 'À propos', mg: 'Momba anay' },
  about_subtitle: {
    fr: 'L’histoire d’Andeaha Hizaha : une invitation à venir voir Jésus ensemble.',
    mg: 'Ny tantaran’ny Andeaha Hizaha : fanasana ho avy hijery an’i Jesosy miaraka.',
  },
  about_verse_quote: {
    fr: 'Notre nom vient d’une invitation simple et profonde de l’Évangile.',
    mg: 'Avy amin’ny fanasana tsotra nefa lalina ao amin’ny Filazantsara ny anarantsika.',
  },
  about_verse_text: {
    fr: 'Viens et vois.',
    mg: 'Andeha hizaha.',
  },
  about_verse_ref: { fr: 'Jean 1:46', mg: 'Jaona 1:46' },
  about_name_kicker: { fr: 'L’origine du nom', mg: 'Ny niandohan’ny anarana' },
  about_name_title: { fr: 'Pourquoi « Andeaha Hizaha » ?', mg: 'Nahoana « Andeaha Hizaha » ?' },
  about_name_text_1: {
    fr: 'Quand Philippe rencontre Jésus, il court trouver son frère Nathanaël et lui dit : « Nous avons trouvé celui dont Moïse a écrit dans la loi et dont les prophètes ont parlé : Jésus de Nazareth. » Nathanaël hésite, mais Philippe ne discute pas : il lui lance simplement « Viens et vois ».',
    mg: 'Rehefa nifanena tamin’i Jesosy i Filipo, dia nihazakazaka nankany amin’i Natanaela rahalahiny izy ary nanao hoe : « Hitanay ilay nanoratan’i Mosesy tao amin’ny lalàna sy nanoratan’ny mpaminany : Jesosy avy any Nazareta. » Nisalasala i Natanaela, fa tsy niady hevitra i Filipo : hoy izy tsotra izao hoe « Andeha hizaha ».',
  },
  about_name_text_2: {
    fr: 'En malgache, « Andeha hizaha » signifie exactement cela : « Viens et vois ». C’est notre cœur de mission : nous ne prétendons pas tout savoir, nous t’invitons simplement à venir découvrir Jésus avec nous, à la lumière de sa Parole.',
    mg: 'Amin’ny teny malagasy, « Andeha hizaha » dia midika hoe : « Avia ka jereo ». Izany no fon’ny asantsika : tsy milaza izahay fa mahalala ny zavatra rehetra, fa manasa anao fotsiny hankeo amin’i Jesosy miaraka aminay, ao amin’ny fahazavan’ny Teniny.',
  },
  about_name_tagline: {
    fr: 'Apprenons ensemble, aux pieds de notre Seigneur.',
    mg: 'Hianatra miaraka isika, eo an-tongotr’i Jesosy Tompontsika.',
  },
  about_name_image: { fr: 'Philippe invite Nathanaël', mg: 'Filipo manasa an’i Natanaela' },
  about_founder_role: { fr: 'Fondateur', mg: 'Mpanorina' },
  about_founder_caption: {
    fr: 'Créé avec un cœur simple et un grand amour pour la Parole de Dieu.',
    mg: 'Vita tamin’ny fo tsotra sy fitiavana lehibe ny Tenin’Andriamanitra.',
  },
  about_founder_text_1: {
    fr: 'Je m’appelle Clarco RAHERINANDRASANA, et cette application est née de mon désir de partager la Parole de Dieu. Je ne suis ni théologien, ni expert de la Bible — je suis simplement un homme passionné par la Parole de Dieu.',
    mg: 'Clarco RAHERINANDRASANA no anarako, ary avy amin’ny faniriako hizara ny Tenin’Andriamanitra ity fampiharana ity. Tsy teolojianina aho, tsy manam-pahaizana momba ny Baiboly — lehilahy feno hafanam-po amin’ny Tenin’Andriamanitra fotsiny aho.',
  },
  about_founder_text_2: {
    fr: 'C’est pourquoi je dis « Andeha hizaha » : je ne te dis pas que j’ai toutes les réponses, je te dis « viens, on va voir ensemble ». J’apprends avec toi, aux pieds de notre Seigneur.',
    mg: 'Koa izany no ilazako hoe « Andeha hizaha » : tsy lazaiko aminao fa manana ny valiny rehetra aho, fa hoy aho hoe « andeha, hijery miaraka isika ». Mianatra miaraka aminao aho, eo an-tongotry ny Tompontsika.',
  },
  about_founder_text_3: {
    fr: 'Cette plateforme rassemble sermons, cours bibliques, la Bible en plusieurs versions, cantiques, documents d’étude et méditations — afin que chacun puisse grandir dans la foi, où qu’il soit.',
    mg: 'Ity sehatra ity dia manangona toriteny, fampianarana Baiboly, ny Baiboly amin’ny dikan-teny maro, fihirana, antontan-taratasy fianarana ary fisaintsainana — mba hahafahan’ny rehetra mitombo ao amin’ny finoana, na aiza na aiza.',
  },
  about_founder_chip_1: { fr: '🙏 Passionné de la Parole', mg: '🙏 Tia ny Teny' },
  about_founder_chip_2: { fr: '💡 Apprenant avec vous', mg: '💡 Mianatra miaraka aminao' },
  about_founder_chip_3: { fr: '🕊️ Serviteur humble', mg: '🕊️ Mpanompo manetry tena' },
  about_mission_kicker: { fr: 'Notre mission', mg: 'Ny asantsika' },
  about_mission_title: { fr: 'Venir, voir et grandir ensemble', mg: 'Avia, jereo ary mitomboa miaraka' },
  about_mission_subtitle: {
    fr: 'Trois convictions simples qui guident tout ce que nous faisons.',
    mg: 'Finoana telo tsotra izay mitarika ny zavatra rehetra ataontsika.',
  },
  about_value_1_title: { fr: 'La Parole d’abord', mg: 'Ny Teny no lohalaharana' },
  about_value_1_text: {
    fr: 'La Bible est au centre de tout : lire, écouter, méditer et partager la Parole qui transforme les vies.',
    mg: 'Ny Baiboly no afovoan’ny zavatra rehetra : mamaky, mihaino, misaintsaina ary mizara ny Teny izay manova ny fiainana.',
  },
  about_value_2_title: { fr: 'Apprendre ensemble', mg: 'Mianatra miaraka' },
  about_value_2_text: {
    fr: 'Personne n’a toutes les réponses. Nous grandissons ensemble, avec humilité, aux pieds de Jésus.',
    mg: 'Tsy misy manana ny valiny rehetra. Mitombo miaraka isika, amin’ny fanetren-tena, eo an-tongotr’i Jesosy.',
  },
  about_value_3_title: { fr: 'Partager librement', mg: 'Mizara maimaim-poana' },
  about_value_3_text: {
    fr: 'Tout le contenu est accessible à tous, gratuitement et même hors-ligne, pour que la Parole circule partout.',
    mg: 'Misy ho an’ny rehetra ny votoaty rehetra, maimaim-poana, ary eny fa na tsy misy aterineto aza, mba hivezivezen’ny Teny na aiza na aiza.',
  },
  about_final_quote: { fr: 'Viens et vois', mg: 'Andeha hizaha' },
  about_final_text: {
    fr: 'Que tu sois nouveau dans la foi ou que tu marches avec Jésus depuis longtemps, tu es le bienvenu ici. Asseyons-nous ensemble et découvrons la beauté de sa Parole.',
    mg: 'Na vaovao amin’ny finoana ianao na efa ela no niara-nandeha tamin’i Jesosy, tonga soa eto ianao. Mipetraha miaraka amintsika ary hitantsika ny hakantony ny Teniny.',
  },
  about_signature: { fr: 'Clarco RAHERINANDRASANA', mg: 'Clarco RAHERINANDRASANA' },
} as const;

export type I18nKey = keyof typeof dict;

export function t(lang: Lang, key: I18nKey): string {
  return dict[key][lang] ?? dict[key].fr;
}

// --- Langues des Bibles --------------------------------------------------
// Le manifest des versions Bible fournit `language` en anglais (ex : Malagasy,
// French, Arabic…). On les traduit en français et en malgache pour l'affichage.
const BIBLE_LANGUAGES: Record<string, { fr: string; mg: string }> = {
  Malagasy: { fr: 'Malgache', mg: 'Malagasy' },
  French: { fr: 'Français', mg: 'Frantsay' },
  English: { fr: 'Anglais', mg: 'Anglisy' },
  Arabic: { fr: 'Arabe', mg: 'Arabo' },
  Afrikaans: { fr: 'Afrikaans', mg: 'Afrikaans' },
  Portuguese: { fr: 'Portugais', mg: 'Portogey' },
  Swahili: { fr: 'Swahili', mg: 'Soahily' },
  Danish: { fr: 'Danois', mg: 'Danoà' },
  German: { fr: 'Allemand', mg: 'Alemàna' },
  'Persian (Farsi)': { fr: 'Persan (Farsi)', mg: 'Persàna (Farsy)' },
  Dutch: { fr: 'Néerlandais', mg: 'Nederlandey' },
  Icelandic: { fr: 'Islandais', mg: 'Islandey' },
  Korean: { fr: 'Coréen', mg: 'Kôreana' },
  Croatian: { fr: 'Croate', mg: 'Kroaty' },
  Vietnamese: { fr: 'Vietnamien', mg: 'Vietnamiana' },
  Hebrew: { fr: 'Hébreu', mg: 'Hebreo' },
  Spanish: { fr: 'Espagnol', mg: 'Espaniola' },
  Samoan: { fr: 'Samoan', mg: 'Samoana' },
  Somali: { fr: 'Somali', mg: 'Somaly' },
  Greek: { fr: 'Grec', mg: 'Grika' },
  Italian: { fr: 'Italien', mg: 'Italiana' },
  Ukrainian: { fr: 'Ukrainien', mg: 'Okrainiana' },
};

/** Nom de langue localisé (fr/mg) à partir du nom anglais du manifest */
export function bibleLanguageName(lang: Lang, englishName: string): string {
  return BIBLE_LANGUAGES[englishName]?.[lang] ?? englishName;
}

/**
 * Libellé d'une version Bible : « Malgache (MG65) », « Français (SBF) »…
 * Le tag est extrait du nom de fichier (MG65, SBF, Niobe…) et mis entre parenthèses.
 */
export function bibleVersionLabel(lang: Lang, v: { file: string; language?: string }): string {
  const tag = v.file.replace(/\.SQLite3$/i, '');
  return `${bibleLanguageName(lang, v.language ?? '')} (${tag})`;
}

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'mg', label: 'Malagasy' },
];

export const TYPE_LABELS: Record<string, I18nKey> = {
  sermon: 'type_sermon',
  course: 'type_course',
  audio: 'type_audio',
  seminar: 'type_seminar',
  conference: 'type_conference',
  article: 'type_article',
};

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function pickTitle(item: { title_fr: string; title_mg: string }, lang: Lang): string {
  return lang === 'mg' && item.title_mg ? item.title_mg : item.title_fr;
}

export function pickDescription(item: { description_fr: string; description_mg: string }, lang: Lang): string {
  return lang === 'mg' && item.description_mg ? item.description_mg : item.description_fr;
}

/**
 * Résout la langue active : paramètre d'URL ?lang= en priorité, puis cookie ah-lang.
 * Le cookie permet de conserver la langue pendant la navigation entre les pages.
 */
export function getLang(
  url: URL,
  cookies?: { get(name: string): { value?: string } | undefined }
): Lang {
  const p = url.searchParams.get('lang');
  if (p === 'mg' || p === 'fr') return p;
  try {
    const c = cookies?.get('ah-lang')?.value;
    if (c === 'mg' || c === 'fr') return c;
  } catch {
    /* ignore */
  }
  return 'fr';
}
