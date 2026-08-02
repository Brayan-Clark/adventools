/**
 * Script de synchronisation des données depuis adventools vers Supabase
 *
 * Ce script télécharge les données du repo GitHub adventools (branche data)
 * et les importe dans Supabase.
 *
 * Usage: node scripts/sync-adventools.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// URLs du repo adventools
const ADVENTOOLS_RAW = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data';

interface CantiqueData {
  id: string;
  num: number;
  title: string;
  key?: string;
  author?: string;
  categories?: string;
  content?: string;
  playback?: string;
  source?: string;
  lang: 'mg' | 'fr' | 'en';
}

interface MofonainaData {
  date: string;
  titre_du_jour: string;
  verset_texte: string;
  verset_reference: string;
  contenu?: string;
  content?: string;
  source?: string;
}

interface HymneManifest {
  versions: Array<{
    id: string;
    name: string;
    language: string;
    file: string;
    url: string;
  }>;
}

/**
 * Télécharge un fichier JSON depuis GitHub
 */
async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Erreur HTTP ${response.status} pour ${url}`);
      return null;
    }
    return await response.json() as T;
  } catch (error) {
    console.error(`Erreur de téléchargement: ${url}`, error);
    return null;
  }
}

/**
 * Obtient la version actuelle de sync depuis Supabase
 */
async function getSyncVersion(table: string): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select('sync_version')
    .order('sync_version', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return 0;
  return (data as any).sync_version || 0;
}

/**
 * Synchronise les cantiques depuis adventools
 */
async function syncCantiques() {
  console.log('\n📥 Synchronisation des cantiques...');

  // 1. Télécharger le manifest
  const manifest = await fetchJson<HymneManifest>(`${ADVENTOOLS_RAW}/hymnes/manifest.json`);
  if (!manifest) {
    console.error('❌ Impossible de télécharger le manifest des cantiques');
    return;
  }

  console.log(`📚 ${manifest.versions.length} recueils trouvés`);

  // 2. Télécharger chaque recueil
  const langMap: Record<string, 'mg' | 'fr' | 'en'> = {
    'Malagasy': 'mg',
    'French': 'fr',
    'English': 'en'
  };

  for (const version of manifest.versions) {
    const lang = langMap[version.language] || 'mg';
    console.log(`  📖 ${version.name} (${lang})...`);

    const cantiques = await fetchJson<CantiqueData[]>(version.url);
    if (!cantiques || !Array.isArray(cantiques)) {
      console.log(`    ⚠️ Pas de données ou format invalide`);
      continue;
    }

    console.log(`    ${cantiques.length} cantiques`);

    // Préparer les données pour Supabase
    const records = cantiques.map(c => ({
      id: `${version.id}_${c.num}`.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      num: c.num,
      title: c.title,
      key: c.key || '',
      author: c.author || '',
      categories: c.categories || '',
      content: c.content || '',
      playback: c.playback || '',
      source: c.source || '',
      lang,
      recueil: version.id,
      sync_version: Date.now()
    }));

    // Insérer/mettre à jour dans Supabase
    const { error } = await supabase
      .from('cantiques')
      .upsert(records, { onConflict: 'id' });

    if (error) {
      console.error(`    ❌ Erreur: ${error.message}`);
    } else {
      console.log(`    ✅ ${records.length} cantiques synchronisés`);
    }
  }
}

/**
 * Synchronise les méditations mofonaina depuis adventools
 */
async function syncMofonaina() {
  console.log('\n📥 Synchronisation des méditations mofonaina...');

  // Les fichiers mofonaina sont nommés par trimestre (ex: 2026-Q3.json)
  // On essaie de télécharger le trimestre actuel
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const currentFile = `${year}-Q${quarter}.json`;

  console.log(`  📅 Fichier: ${currentFile}`);

  const mofonaina = await fetchJson<{ meditations: MofonainaData[] }>(
    `${ADVENTOOLS_RAW}/mofonaina/${currentFile}`
  );

  if (!mofonaina || !mofonaina.meditations) {
    console.error('❌ Impossible de télécharger les méditations');
    return;
  }

  console.log(`  ${mofonaina.meditations.length} méditations trouvées`);

  // Préparer les données pour Supabase
  const records = mofonaina.meditations.map(m => ({
    date: m.date,
    titre_du_jour: m.titre_du_jour,
    verset_texte: m.verset_texte,
    verset_reference: m.verset_reference,
    contenu: m.contenu || '',
    content: m.content || '',
    source: m.source || '',
    sync_version: Date.now()
  }));

  // Insérer/mettre à jour dans Supabase
  const { error } = await supabase
    .from('mofonaina')
    .upsert(records, { onConflict: 'date' });

  if (error) {
    console.error(`❌ Erreur: ${error.message}`);
  } else {
    console.log(`✅ ${records.length} méditations synchronisées`);
  }
}

/**
 * Importe les versets du jour depuis les données existantes
 */
async function importVerses() {
  console.log('\n📥 Import des versets du jour...');

  // Les versets sont dans le fichier content.json local
  try {
    const fs = await import('fs');
    const path = await import('path');

    const contentPath = path.join(process.cwd(), 'data', 'content.json');
    if (!fs.existsSync(contentPath)) {
      console.log('⚠️ Fichier content.json non trouvé, skip');
      return;
    }

    const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));

    if (!content.verses || !Array.isArray(content.verses)) {
      console.log('⚠️ Pas de versets dans content.json');
      return;
    }

    console.log(`  ${content.verses.length} versets trouvés`);

    const { error } = await supabase
      .from('verses')
      .upsert(content.verses, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Erreur: ${error.message}`);
    } else {
      console.log(`✅ ${content.verses.length} versets importés`);
    }
  } catch (error) {
    console.error('Erreur lors de l\'import des versets:', error);
  }
}

/**
 * Importe les médias depuis les données existantes
 */
async function importMedia() {
  console.log('\n📥 Import des médias...');

  try {
    const fs = await import('fs');
    const path = await import('path');

    const contentPath = path.join(process.cwd(), 'data', 'content.json');
    if (!fs.existsSync(contentPath)) {
      console.log('⚠️ Fichier content.json non trouvé, skip');
      return;
    }

    const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));

    if (!content.media || !Array.isArray(content.media)) {
      console.log('⚠️ Pas de médias dans content.json');
      return;
    }

    console.log(`  ${content.media.length} médias trouvés`);

    // Mapper les catégories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, slug');

    const categoryMap = new Map((categories || []).map(c => [c.slug, c.id]));

    // Préparer les records
    const records = content.media.map((m: any) => ({
      type: m.type,
      slug: m.slug,
      title_fr: m.title_fr,
      title_mg: m.title_mg || m.title_fr,
      description_fr: m.description_fr || '',
      description_mg: m.description_mg || '',
      content_fr: m.content_fr || '',
      content_mg: m.content_mg || '',
      speaker: m.speaker || '',
      image: m.image || '',
      video_url: m.video_url || '',
      audio_url: m.audio_url || '',
      duration: m.duration || '',
      date: m.date || '',
      category_id: m.category ? categoryMap.get(m.category) : null,
      tags: m.tags || [],
      featured: m.featured || false,
      views: m.views || 0,
      lessons: m.lessons || []
    }));

    // Insérer par batches de 50
    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase
        .from('media')
        .upsert(batch, { onConflict: 'slug' });

      if (error) {
        console.error(`❌ Erreur batch ${i}: ${error.message}`);
      } else {
        console.log(`  ✅ Batch ${i / batchSize + 1}/${Math.ceil(records.length / batchSize)}`);
      }
    }

    console.log(`✅ ${records.length} médias importés`);
  } catch (error) {
    console.error('Erreur lors de l\'import des médias:', error);
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Synchronisation adventools → Supabase');
  console.log('========================================');

  // Sync cantiques
  await syncCantiques();

  // Sync mofonaina
  await syncMofonaina();

  // Import versets (depuis les données locales)
  await importVerses();

  // Import médias (depuis les données locales)
  await importMedia();

  console.log('\n✨ Synchronisation terminée !');
}

main().catch(console.error);
