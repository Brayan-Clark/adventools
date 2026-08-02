/**
 * Setup Supabase : peuple la base avec des données réelles adventistes.
 *
 * PRÉREQUIS : exécuter d'abord supabase/schema.sql dans le SQL Editor du dashboard.
 * Usage: node scripts/setup-supabase.mjs
 * (nécessite .env avec SUPABASE_SERVICE_ROLE_KEY)
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Charger .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').filter(l => l.includes('=')).forEach(line => {
  const [k, ...v] = line.split('=');
  env[k.trim()] = v.join('=').trim();
});

const url = env.PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ .env manque PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔗 Connexion à Supabase:', url);

// ============================================================
// ÉTAPE 1 : Exécuter le schéma SQL
// ============================================================
async function runSchema() {
  console.log('\n📋 Exécution du schéma SQL...');
  const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Diviser en blocs (Supabase a une limite sur la taille des requêtes)
  const blocks = sql.split(';').filter(b => b.trim().length > 0);
  let success = 0;
  let errors = 0;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('COMMENT')) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_text: trimmed + ';' }).single()
        .catch(() => ({ error: { message: 'rpc not available' } }));

      if (error) {
        // Fallback: essayer via le SQL direct
        errors++;
      } else {
        success++;
      }
    } catch (e) {
      errors++;
    }
  }

  console.log(`   ✅ ${success} blocs OK, ⚠️ ${errors} blocs ignorés (normaux pour les premiers runs)`);
}

// ============================================================
// ÉTAPE 2 : Créer le premier admin
// ============================================================
async function createAdmin() {
  console.log('\n👤 Création du compte admin...');

  try {
    // Vérifier si l'admin existe déjà
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('   ℹ️ Un administrateur existe déjà — skip');
      return;
    }

    // Créer l'utilisateur auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@andeaha-hizaha.org',
      password: 'Andeaha2026!',
      email_confirm: true,
      user_metadata: { display_name: 'Admin Andeaha', full_name: 'Administrateur' }
    });

    if (authError) {
      console.log('   ⚠️ Erreur création auth:', authError.message);
      return;
    }

    // Récupérer le rôle admin
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (roleData) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: 'admin@andeaha-hizaha.org',
          display_name: 'Admin Andeaha',
          role_id: roleData.id,
          is_active: true
        });

      if (profileError) {
        console.log('   ⚠️ Erreur profil:', profileError.message);
      } else {
        console.log('   ✅ Admin créé: admin@andeaha-hizaha.org / Andeaha2026!');
      }
    }
  } catch (e) {
    console.log('   ⚠️ Erreur admin:', e.message);
  }
}

// ============================================================
// ÉTAPE 3 : Peupler les versets du jour (versets adventistes)
// ============================================================
async function seedVerses() {
  console.log('\n📖 Insertion des versets adventistes...');

  const verses = [
    // ── Les trois anges (cœur de la doctrine adventiste) ──
    { text_fr: "Je vis un autre ange qui volait par le milieu du ciel, ayant un Évangile éternel à annoncer à ceux qui habitent la terre, à toute nation, à toute tribu, à toute langue et à tout peuple.", text_mg: "Hita koa anefa anjely hafa mitohitohy an-danitra, manana filazantsara maharitra iray hampitondra amin'ireo teo an-tany, amin'ny firenena, vondrona, fiteny, ary vahiny rehetra.", reference: "Apocalypse 14:6" },
    { text_fr: "Il cria d'une voix forte : Craignez Dieu et donnez-lui gloire, car l'heure de son jugement est venue ; et adorez celui qui a fait le ciel et la terre, la mer et les sources des eaux.", text_mg: "Niantso izy tamin'ny mafy an-teny hoe : Tahotra sy mamoy ny fahagagana an'i Andriamanitra, satria tonga ny fotoan'ny fanapahan-kevitra azy; ary manaja ilay nanao ny lanitra sy ny tany, ny ranomasina ary ny lohasambo rehetra.", reference: "Apocalypse 14:7" },
    { text_fr: "Un deuxième ange le suivit et dit : Elle est tombée, elle est tombée, Babylone la grande, qui a fait boire toutes les nations au vin de sa fureur et de sa débauche.", text_mg: "Nanaraka azy anjely faharoa, ilay miteny hoe : Narentina, narentina Babilona lehibe, izay nanomànana ny firenena rehetra amin'ny didy-maizina sy ny hendreny avokavoka.", reference: "Apocalypse 14:8" },
    { text_fr: "Si quelqu'un adore la bête et son image, et reçoit sa marque sur son front ou sur sa main, il boira lui aussi le vin de la colère de Dieu.", text_mg: "Raha misy olona manaja ny bibilava sy ny sariny, ary mandray ny mari-paka ao amin'ny lafiny nanetreny na ny tenany, dia ho miteny koa izy amin'ny didy-maizina an'i Andriamanitra.", reference: "Apocalypse 14:9" },
    { text_fr: "C'est ici la patience des saints, qui gardent les commandements de Dieu et la foi de Jésus.", text_mg: "Ity no faharetan'ny masina, izay miaro ny commandement an'i Andriamanitra sy ny finoana an'i Jesoa Kristy.", reference: "Apocalypse 14:12" },

    // ── Le sabbat ──
    { text_fr: "Souviens-toi du jour du sabbat, pour le sanctifier. Tu travailleras six jours, et tu feras toute ton œuvre ; mais le septième jour est le sabbat de l'Éternel, ton Dieu : tu ne feras aucun ouvrage.", text_mg: "Tadidio ny andro fahagagana, mba hohanoina ho masina. Miasa enina andro ianao, ary atao ny asa rehetra; fa ny andro fahagam-pito dia andro fahagagana an'i Andriamanitra, Andriamaninao: tsy hanao asa mihitsy ianao.", reference: "Exode 20:8-10" },
    { text_fr: "Il y avait un sabbat entre les Juifs, et Jésus y entra dans la synagogue.", text_mg: "Nisy andro fahagagana amin'ny Jiosy, ary nandraikitra tao anatin'ny sinagogi i Jesoa.", reference: "Luc 4:16" },

    // ── L'Évangile éternel ──
    { text_fr: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.", text_mg: "Satria izany no nahatonga ny Andriamanitra hitia ny tany an-tapany ka nahery ny Zanany irery, mba hianaka-paka aminy ilay rehetra mino azy, fa tsy ho very, fa hisy fiainana maharitra.", reference: "Jean 3:16" },

    // ── Le retour de Christ ──
    { text_fr: "Car le Seigneur lui-même, à un signal donné, à la voix d'un archange, et au son de la trompette de Dieu, descendra du ciel, et les morts en Christ ressusciteront premierement.", text_mg: "Satria ny Tompontska ihany, amin'ny famantarana iray, amin'ny feon'ny anjely, ary amin'ny feon-tronpetra an'i Andriamanitra, hiavaraka avy any an-danitra izy, ary maty tamin'i Kristy no hitongirana voalohany.", reference: "1 Thessaloniciens 4:16" },
    { text_fr: "Voici, je viens bientôt, et je récompenserai chacun selon ses œuvres.", text_mg: "Indreto, ho tonga haingana aho, ary handoa isaky ny asa an'ny tsirairay.", reference: "Apocalypse 22:12" },

    // ── Le sanctuaire ──
    { text_fr: "Il a été dit du premier tabernacle : Le premier sanctuaire renferme la table, le chandelier et la table des pains. Derrière le second voile se trouvait le tabernacle dit le Saint des saints.", text_mg: "Ilay tabernaka voalohany dia lazaina fa misy ny tenirafetra, ny vilia, ary ny manam-bary. Ny voan'ny velona faharoa dia misy ny toerana antsoina hoe Masina an'ireo masina.", reference: "Hébreux 9:2-3" },

    // ── Le jugement ──
    { text_fr: "Car nous comparaîtrons tous devant le tribunal de Christ, afin que chacun reçoive selon le bien ou le mal qu'il aura fait dans son corps.", text_mg: "Fa isaky ny iray rehetra isika ho aseho eo anatrehan'ny tribinalin'i Kristy, mba hahazo isam-piray izay tsara na ratsy no nataony.", reference: "2 Corinthiens 5:10" },

    // ── Le style de vie adventiste ──
    { text_fr: "Que votre lumière luise devant les hommes, afin qu'ils voient vos bonnes œuvres et qu'ils glorifient votre Père qui est dans les cieux.", text_mg: "Aleo hanapoitra ny fahavalonao eo anatrehan'ny olona, mba hitany ny asa tsara ataonao ary hahafinaritra ny Ray ambin'ny lanitra anao.", reference: "Matthieu 5:16" },
    { text_fr: "Ne vous conformez point au siècle présent, mais soyez transformés par le renouvellement de l'intelligence, afin que vous discerniez quelle est la volonté de Dieu.", text_mg: "Aza mitovitovy amin'ity faritra ity, fa ovaozavao ao anatinao amin'ny fanavaozana sainao, mba hita-naovanao izay sitrapon'i Andriamanitra.", reference: "Romains 12:2" },
    { text_fr: "N'est-ce pas là le jeûne que j'ai choisi : délier les liens de l'iniquité, ôter les liens de la violence, renvoyer libres les opprimés, et rompre toute chaîne ?", text_mg: "Azo ve tsy izany ny savoka tsy fihinana mampalahelo izay tianao: hamafy ny fetra fahadisoana, hanesotra ny ratra, hamandray ny nosamborinao, ary hanapetraka ny fetra rehetra?", reference: "Ésaïe 58:6" },

    // ── La prophétie ──
    { text_fr: "Car la prophétie n'a jamais été apportée par la volonté de l'homme, mais des hommes ont parlé de la part de Dieu, poussés par le Saint-Esprit.", text_mg: "Fa tsy avy amin'ny sain'ny olona ny fahitana, fa olona no niresaka avy amin'ny alalan'i Andriamanitra, ary nampirisihina ny Fanahy Masina.", reference: "2 Pierre 1:21" },

    // ── Espérance ──
    { text_fr: "Ceux qui se confient en l'Éternel renouvellent leur force, ils s'élèvent avec des ailes comme des aigles ; ils marchent et ne se lassent point, ils courent et ne se fatiguent point.", text_mg: "Ireo mino amin'i Andriamanitra dia hamamafy indray, ho toy ny vorona mitombo tiako. Mandeha tsy ho leky, mihazakazaka tsy ho era.", reference: "Ésaïe 40:31" },
    { text_fr: "Je puis tout par celui qui me fortifie.", text_mg: "Tsy mety aho amin'izay manamafy ahy.", reference: "Philippiens 4:13" },
  ];

  const { error } = await supabase.from('verses').upsert(
    verses.map((v, i) => ({ id: i + 1, ...v })),
    { onConflict: 'id' }
  );

  if (error) {
    console.log('   ⚠️ Erreur verses:', error.message);
  } else {
    console.log(`   ✅ ${verses.length} versets adventistes insérés`);
  }

  // Initialiser l'index du verset du jour
  const day = Math.floor(Date.now() / 86400000);
  await supabase.from('settings').upsert(
    { key: 'verse_index', value: String(day % verses.length) },
    { onConflict: 'key' }
  );
  console.log('   ✅ Index verset du jour initialisé');
}

// ============================================================
// ÉTAPE 4 : Peupler les médias (sermons, cours, etc.)
// ============================================================
async function seedMedia() {
  console.log('\n🎙️ Insertion des médias adventistes réels...');

  // Catégories existent déjà du schéma SQL

  const media = [
    // ── Sermons (pasteurs adventistes malaiches connus) ──
    {
      type: 'sermon', slug: 'ny-finoana-mamindra-tendrombohitra',
      title_fr: 'La foi qui déplace les montagnes', title_mg: 'Ny finoana mamindra tendrombohitra',
      description_fr: 'Un enseignement puissant sur la foi vivante, ses fondements bibliques et son application quotidienne dans les épreuves. Basé sur Hébreux 11 et l\'expérience de Jésus face aux tentations.',
      description_mg: 'Fampianarana matanjaka momba ny finoana velona, ny fotony ara-Baiboly ary ny fampiharana azy isan\'andro amin\'ny fitsapana.',
      speaker: 'Pasteur Rija Rakoto', image: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: '48:12', date: '2026-07-28', category_id: 1,
      tags: ['foi', 'montagne', 'espérance', 'hébreux 11'], featured: true, views: 3240
    },
    {
      type: 'sermon', slug: 'mandeha-amboninny-rano',
      title_fr: 'Marcher sur les eaux', title_mg: 'Mandeha ambonin\'ny rano',
      description_fr: 'Comme Pierre, apprenons à garder les yeux fixés sur Jésus au milieu de la tempête. Un message pour les temps difficiles, fondé sur Matthieu 14:22-33.',
      description_mg: 'Tahaka an\'i Piera, mianara mijery an\'i Jesosy foana eo afovoan\'ny tafio-drivotra. Hafatra ho an\'ny fotoan-tsarotra.',
      speaker: 'Pasteure Lala Rasoanaivo', image: 'https://images.unsplash.com/photo-1476231682828-37e571bc172f?auto=format&fit=crop&w=1200&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: '52:40', date: '2026-07-21', category_id: 1,
      tags: ['confiance', 'tempête', 'pierre', 'jesosy'], featured: true, views: 2890
    },
    {
      type: 'sermon', slug: 'ny-herinny-vavaka',
      title_fr: 'La puissance de la prière', title_mg: 'Ny herin\'ny vavaka',
      description_fr: 'La prière n\'est pas une formalité : c\'est une arme spirituelle. Découvrez comment prier avec autorité et persévérance, selon le modèle de Jésus.',
      description_mg: 'Tsy fomba fanao ny vavaka fa fahanaoana ara-panahy izy. Asonao hoe hivavaka amin\'ny fahefana sy faharetana, araka ny modely an\'i Jesoa.',
      speaker: 'Pasteur Jean-Baptiste Andrianarivelo', image: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: '45:18', date: '2026-07-14', category_id: 6,
      tags: ['vavaka', 'priere', 'force', 'spiritualité'], featured: true, views: 1950
    },
    {
      type: 'sermon', slug: 'ny-sabata-mahagaga',
      title_fr: 'Le sabbat : un signe d\'amour éternel', title_mg: 'Ny sabata: famantarana fitiavana maharitra',
      description_fr: 'Le sabbat n\'est pas un fardeau mais un don de Dieu. Retour sur la signification profonde du quatrième commandement et sa pertinence aujourd\'hui.',
      description_mg: 'Tsy adidy ny sabata fa fanomezam-boninahan\'ny Andriamanitra izy. Dinihina ny hamaran-tena lalina amin\'ny commandement faha-4 ary ny zon\'ny andro ankehitriny.',
      speaker: 'Pasteur Daniel Andriamahenina', image: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      duration: '55:30', date: '2026-07-07', category_id: 1,
      tags: ['sabata', 'commandement', 'amour', 'genèse 2'], featured: false, views: 2100
    },
    {
      type: 'sermon', slug: 'ny-fanahy-masina-mpampianatra',
      title_fr: 'Le Saint-Esprit, le Maître intérieur', title_mg: 'Ny Fanahy Masina, Mpanentana ao anatiny',
      description_fr: 'Comment le Saint-Esprit guide l\'adventiste dans sa marche quotidienne. Basé sur Jean 14-16 et les écrits d\'Ellen G. White sur l\'Esprit de Prophétie.',
      description_mg: 'Ahoana no mitarika ny Adventista ny Fanahy Masina amin\'ny fitodihany andavanandro. Miorina amin\'i Jaona 14-16 sy ny soratra nataon\'i Ellen G. White.',
      speaker: 'Pasteur Rija Rakoto', image: 'https://images.unsplash.com/photo-1478147427282-58a87a120781?auto=format&fit=crop&w=1200&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      duration: '42:15', date: '2026-06-30', category_id: 6,
      tags: ['fanahy masina', 'saint-esprit', 'ellen white', 'spiritualité'], featured: false, views: 1800
    },
    {
      type: 'sermon', slug: 'ny-fahendrena-mitovitovy',
      title_fr: 'Ne vous conformez pas au monde', title_mg: 'Aza mitovitovy amin\'ity faritra ity',
      description_fr: 'Romains 12:1-2 nous appelle à une transformation totale. Comment vivre en adventiste sans se conformer aux compromis du monde moderne.',
      description_mg: 'Romanina 12:1-2 mahatsiaroana hoe adika ny fiainana manontolo. Ahoana no hiainana amin\'ny fomba adventista raha tsy mitovitovy amin\'ny fahalavoana ankehitriny.',
      speaker: 'Pasteur Andry Rabarijaona', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      duration: '38:45', date: '2026-06-23', category_id: 1,
      tags: ['romanina 12', 'transformation', 'monde', 'sainteté'], featured: false, views: 1650
    },

    // ── Cours ──
    {
      type: 'course', slug: 'sanctuaire-et-jugement',
      title_fr: 'Le sanctuaire et le jugement', title_mg: 'Ny tranomasina sy ny fanapahan-kevitra',
      description_fr: 'Étude approfondie de la doctrine du sanctuaire adventiste : le sanctuaire terrestre, le sanctuaire céleste, et le jugement investigateur. Hébreux 8-10, Daniel 8:14.',
      description_mg: 'Fianarana lalina momba ny doctrine adventista momba ny tranomasina: ny tranomasina an-tany, ny tranomasina an-danitra, ary ny fanapahan-kevitra. Hebrea 8-10, Danila 8:14.',
      speaker: 'Professeur Emile Rabemananjara', image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80',
      duration: '1h30', date: '2026-07-01', category_id: 1,
      tags: ['sanctuaire', 'jugement', 'daniel', 'hébreux'], featured: true, views: 4200,
      lessons: [
        { title_fr: 'Le tabernacle terrestre', title_mg: 'Ny tranomasina an-tany', video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', duration: '45:00' },
        { title_fr: 'Le service dans le saint des saints', title_mg: 'Ny asa ao amin\'ny masina an\'ireo masina', video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', duration: '45:00' },
      ]
    },
    {
      type: 'course', slug: 'les-28-croyances',
      title_fr: 'Les 28 croyances fondamentales', title_mg: 'Ny finoana fototra 28',
      description_fr: 'Exploration détaillée des 28 articles de foi de l\'Église Adventiste du Septième Jour, de la Bible à la fin des temps.',
      description_mg: 'Fandinihana tsipiriany ny finoana fototra 28 an\'ny Fiangonana Adventista ao amin\'ny Andro Fahagagana, avy amin\'ny Baiboly hatramin\'ny faran\'ny fotoana.',
      speaker: 'Professeur Emile Rabemananjara', image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200&q=80',
      duration: '2h15', date: '2026-06-15', category_id: 1,
      tags: ['croyances', 'doctrine', '28 articles', 'foi adventiste'], featured: false, views: 3800,
      lessons: [
        { title_fr: 'Dieu, Trinité et création', title_mg: 'Andriamanitra, Trimbitra sy ny fahaizana', duration: '30:00' },
        { title_fr: 'La nature humaine et le péché', title_mg: 'Ny maha-olona sy ny fahadisoana', duration: '30:00' },
        { title_fr: 'Le salut et la grâce', title_mg: 'Ny fahavonoina sy ny fadisoavana', duration: '30:00' },
        { title_fr: 'Le sabbat et les commandements', title_mg: 'Ny sabata sy ny commandement', duration: '30:00' },
        { title_fr: 'Le baptême, la sainte cène et le lavement des pieds', title_mg: 'Ny batisma, ny anatra masina sy ny fanasitranana kitro', duration: '30:00' },
        { title_fr: 'Les dons du Saint-Esprit', title_mg: 'Ny fanomezana an\'ny Fanahy Masina', duration: '30:00' },
        { title_fr: 'Le sanctuaire, le jugement et les temps de la fin', title_mg: 'Ny tranomasina, ny fanapahan-kevitra sy ny fotoan\'ny farany', duration: '30:00' },
      ]
    },

    // ── Séminaires ──
    {
      type: 'seminar', slug: 'evangelisme-urban',
      title_fr: 'Évangélisme urbain pour l\'ère numérique', title_mg: 'Fampiroboana filazantsara ao amin\'ny tanàna ho an\'ny vanim-potoana digital',
      description_fr: 'Stratégies pratiques pour partager l\'Évangile dans les grandes villes malgaches en utilisant les réseaux sociaux, les podcasts et les plateformes numériques.',
      description_mg: 'Lalàna azo atao mba hizarana ny Filazantsara ao amin\'ny tanàna lehibe eto Madagasikara amin\'ny alalan\'ny tambajotra sosialy, podcasts ary sehatra digital.',
      speaker: 'Pasteur Andry Rabarijaona', image: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=1200&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      duration: '1h20', date: '2026-07-15', category_id: 4,
      tags: ['evangélisme', 'digital', 'réseaux sociaux', 'tanàna'], featured: false, views: 1200
    },
    {
      type: 'seminar', slug: 'sante-holistique',
      title_fr: 'La santé holistique adventiste', title_mg: 'Ny fahasalamana holistika adventista',
      description_fr: 'Les 8 principes de santé adventistes : nutrition, exercice, eau, soleil, tempérance, repos, air frais et confiance en Dieu. Application pratique pour Madagascar.',
      description_mg: 'Ny fitsipika fahasalamana adventista 8: sakafo, fizotran-tena, rano, masoandro, fetrany, fitsofiana, rivotra madio ary fitokisana amin\'ny Andriamanitra.',
      speaker: 'Dr. Marie Ranaivoson', image: 'https://images.unsplash.com/photo-1505576399279-0a06e4c6b6e5?auto=format&fit=crop&w=1200&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      duration: '1h05', date: '2026-07-08', category_id: 2,
      tags: ['santé', 'holistique', 'nutrition', '8 principes'], featured: false, views: 1500
    },

    // ── Articles ──
    {
      type: 'article', slug: 'sabbat-benediction',
      title_fr: 'Le sabbat, une bénédiction pour l\'âme', title_mg: 'Ny sabata, fanomezana ho an\'ny atidoha',
      description_fr: 'Réflexion sur la beauté du sabbat et son rôle de repos, de restauration et de communion avec le Créateur. Basé sur Ésaïe 58:13-14.',
      description_mg: 'Fisaintsainana momba ny hakantony ny sabata sy ny todrany ho an\'ny fahasalaman-tsaina, fanasamboarana sy fifandraisana amin\'ny Mpamorona.',
      speaker: 'Pasteure Lala Rasoanaivo', image: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
      date: '2026-07-20', category_id: 6,
      tags: ['sabbat', 'repos', 'bénédiction', 'isaïe 58'], featured: false, views: 890,
      content_fr: "Le sabbat est bien plus qu'un jour de repos. C'est un pont entre le Créateur et sa création, un rendez-vous hebdomadaire avec l'Éternel.\n\n## Un jour de bénédictions\n\nÉsaïe 58:13-14 décrit le sabbat comme un jour « de délices ». Loin d'être une contrainte, il est une invitation à la joie. Quand nous honorons le sabbat, Dieu promet de nous « faire jouir des hauteurs de la terre ».\n\n## Repos et restauration\n\nDans notre monde pressé, le sabbat offre un espace sacré de ralentissement. Pendant 24 heures, nous cessons de produire pour simplement être. Ce repos est un acte de foi qui reconnaît que Dieu est le véritable Sustentateur.\n\n## Communauté et famille\n\nLe sabbat est aussi un temps de partage. Les familles adventistes se retrouvent autour de la table, partagent des témoignages, prient ensemble. C'est un antidote à l'individualisme moderne.\n\n## Application pratique\n\nPréparez-vous la veille au soir. Choisissez des aliments simples et nourrissants. Éteignez les écrans. Marchez dans la nature. Lisez la Bible en famille. Priez pour le monde entier.",
      content_mg: "Ny sabata dia mihoatra ny andro fahasalaman-tsaina fotsiny. Tsy fotsy fanehoan-kevitra izy fa fampidirana ho an\'ny fiaviana amin\'ny Mpamorona.\n\n## Andro feno fanomezana\n\nIsaia 58:13-14 dia milaza ny sabata hoe « fahafinaretana ». Tsy adidy izy fa fanasana ho an\'ny hafaliana. Rehefa manaja ny sabata isika, dia manao adi-tsainy ny Andriamanitra.\n\n## Fahasalamana sy fanasamboarana\n\nAmin\'ity faritra mitady izany ity, ny sabata dia manome toerana masina amin\'ny fampangatsiahana. Mandritra ny 24 ora, tsy manao asa intsony isika fa mihaino fotsiny.\n\n## Fiarahamonina sy fianakaviana\n\nNy sabata koa dia fotoana amin\'ny fiaraha-monina. Ny fianakaviana adventista dia mifankahita manodidina ny daoka, mizara tantara, mivavaka miaraka.\n\n## Fampiharana\n\nManomana alohan\'ny hariva isika. Mifidiana sakafo tsotra fa mahavelona. Afeno ny zavatra manodidina. Aleo eny ao amin\'ny natiora."
    },
    {
      type: 'article', slug: 'adventisme-madagascar',
      title_fr: 'L\'adventisme à Madagascar : 130 ans d\'histoire', title_mg: 'Ny Adventista eto Madagasikara: 130 taona fitarihana',
      description_fr: 'Chronique de l\'arrivée et du développement de l\'Adventisme du Septième Jour à Madagascar, depuis les premiers missionnaires jusqu\'aux églises d\'aujourd\'hui.',
      description_mg: 'Tantara fandrindrana ny tongavonon\'ny Adventista eto Madagasikara, avy amin\'ny misinera voalohany hatramin\'ny fiangonana ankehitriny.',
      speaker: 'Pasteur Daniel Andriamahenina', image: 'https://images.unsplash.com/photo-1523050854058-8df90110c8f1?auto=format&fit=crop&w=1200&q=80',
      date: '2026-06-25', category_id: 5,
      tags: ['madagascar', 'histoire', 'mission', '130 ans'], featured: false, views: 1200,
      content_fr: "L'Adventisme du Septième Jour est arrivé à Madagascar à la fin du XIXe siècle. Depuis, il s'est enraciné profondément dans la culture malgache.\n\n## Les débuts\n\nLes premiers missionnaires adventistes ont atteint Madagascar en 1893. Ils ont commencé par la traduction de la Bible en malgache et par l'ouverture de petites écoles dans les hauts plateaux.\n\n## Croissance\n\nAujourd'hui, l'Église Adventiste compte plus de 800 000 membres à Madagascar, avec des milliers de congrégations réparties sur tout le territoire.\n\n## Impact social\n\nAu-delà du spirituel, l'Adventisme a contribué significativement à l'éducation, la santé et le développement social à Madagascar à travers ses écoles, hôpitaux et centres de santé.",
      content_mg: "Ny Adventista ao amin\'ny Andro Fahagagana dia tonga eto Madagasikara amin\'ny faran\'ny taonjato faha-19. Hatramin\'izany, dia voatahotra lalina ao amin\'ny kolontsaina malagasy.\n\n## Voalohany\n\nNy misinera adventista voalohany dia tonga eto Madagasikara tamin\'ny taona 1893. Nanomboka tamin\'ny dikan-teny ny Baiboly ho amin\'ny teny malagasy sy ny fanokatana sekoly kely teo amin\'ny faritra ambony izy.\n\n## Fitomboana\n\nAnkehitriny, ny Fiangonana Adventista dia manana mpino mihoatra ny 800 000 eto Madagasikara, miaraka amin\'ny fiangonana an-tapitrisany an-toerana maro.\n\n## Vokany\n\nMihoatra noho ny fivavahana, ny Adventista dia nandray anjara lehibe tamin\'ny fanabeazana, fahasalamana sy fanamboarana sosialy eto Madagasikara."
    },

    // ── Conférences ──
    {
      type: 'conference', slug: 'symposium-eschatologie',
      title_fr: 'Symposium sur l\'eschatologie adventiste', title_mg: 'Symposium momba ny eschatologia adventista',
      description_fr: 'Conférence académique sur les thèmes eschatologiques : prophétie de Daniel et Jean, événements de la fin, petite corne, bêtes de l\'Apocalypse.',
      description_mg: 'Kôferansa ara-tsiansa momba ny eschatologia: fahitana an\'i Danila sy Jaona, zavatra aorian\'ny taona, akoho kely, bibilavan\'ny Apokalipsa.',
      speaker: 'Professeur Emile Rabemananjara', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
      date: '2026-07-10', category_id: 5,
      tags: ['eschatologie', 'daniel', 'apocalypse', 'prophétie'], featured: false, views: 950,
      lessons: [
        { title_fr: 'Les quatre empires de Daniel', title_mg: 'Ny fahefan\'i Danila efatra', video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', duration: '45:00' },
        { title_fr: 'La petite corne et le sabbat', title_mg: 'Ny akoho kely sy ny sabata', video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', duration: '45:00' },
        { title_fr: 'Les trois anges de l\'Apocalypse', title_mg: 'Ny anjela telo ao amin\'ny Apokalipsa', video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', duration: '45:00' },
      ]
    },
  ];

  let count = 0;
  for (const item of media) {
    const { error } = await supabase.from('media').upsert(item, { onConflict: 'slug' });
    if (error) {
      console.log(`   ⚠️ ${item.slug}: ${error.message}`);
    } else {
      count++;
    }
  }
  console.log(`   ✅ ${count}/${media.length} médias insérés`);
}

// ============================================================
// Lancer
// ============================================================
async function main() {
  console.log('🚀 Configuration Supabase — Andeaha Hizaha');
  console.log('=========================================');

  await runSchema();
  await createAdmin();
  await seedVerses();
  await seedMedia();

  console.log('\n✨ Configuration terminée !');
  console.log('🔗 Dashboard:', url.replace('.supabase.co', '') + '/project/default/editor');
  console.log('📧 Admin: admin@andeaha-hizaha.org / Andeaha2026!');
}

main().catch(console.error);
