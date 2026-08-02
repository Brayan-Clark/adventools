import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
// Préfixe PUBLIC_ : ces valeurs sont intégrées dans le bundle client au build
// (le navigateur les lit). La clé anon est publique par conception — c'est le
// Row Level Security de Supabase qui protège les données.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

const IS_CONFIGURED = Boolean(supabaseUrl && supabaseAnonKey);

if (!IS_CONFIGURED) {
  console.warn('[Andeaha] PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY non définis — mode build sans données.');
}

// Client Supabase pour le navigateur (anon key)
// Si les variables d'env manquent (build sans .env), on crée un client factice
// qui renvoie des résultats vides : les pages se construisent sans données
// mais sans erreur fatale.
export const supabase = IS_CONFIGURED
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      // Site 100% statique : pas de Realtime nécessaire (évite WebSocket)
      realtime: { enabled: false }
    })
  : createClient('https://placeholder.supabase.co', 'placeholder', {
      auth: { persistSession: false },
      realtime: { enabled: false }
    });

// Types pour les tables
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, any>;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  role_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  role?: Role;
}

export interface Category {
  id: number;
  slug: string;
  name_fr: string;
  name_mg: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface MediaItem {
  id: number;
  type: 'sermon' | 'course' | 'audio' | 'seminar' | 'conference' | 'article';
  slug: string;
  title_fr: string;
  title_mg: string | null;
  description_fr: string;
  description_mg: string;
  content_fr: string;
  content_mg: string;
  speaker: string;
  image: string;
  video_url: string;
  audio_url: string;
  duration: string;
  date: string;
  category_id: number | null;
  tags: string[];
  featured: boolean;
  views: number;
  lessons: Lesson[];
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Lesson {
  title_fr: string;
  title_mg: string;
  video_url?: string;
  audio_url?: string;
  duration?: string;
}

export interface Verse {
  id: number;
  text_fr: string;
  text_mg: string;
  reference: string;
  created_at: string;
}

export interface Cantique {
  id: string;
  num: number;
  title: string;
  key: string;
  author: string;
  categories: string;
  content: string;
  playback?: string;
  source: string;
  lang: 'mg' | 'fr' | 'en';
  recueil: string;
  sync_version: number;
  created_at: string;
  updated_at: string;
}

export interface MofonainaDay {
  date: string;
  titre_du_jour: string;
  verset_texte: string;
  verset_reference: string;
  contenu?: string;
  content?: string;
  source?: string;
  sync_version: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// FONCTIONS D'AUTHENTIFICATION
// ============================================================

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userProfile } = await supabase
    .from('users')
    .select('*, role:roles(*)')
    .eq('id', user.id)
    .single();

  return userProfile as User | null;
}

export async function hasPermission(user: User | null, resource: string, action: string): Promise<boolean> {
  if (!user || !user.role) return false;
  if (user.role.name === 'admin') return true;

  const permissions = user.role.permissions;
  return permissions?.[resource]?.[action] === true;
}

// ============================================================
// FONCTIONS MEDIA
// ============================================================

export async function getMedia(options: {
  type?: MediaItem['type'];
  limit?: number;
  featured?: boolean;
  category?: string;
} = {}) {
  let query = supabase
    .from('media')
    .select('*, category:categories(*)')
    .order('featured', { ascending: false })
    .order('date', { ascending: false });

  if (options.type) {
    query = query.eq('type', options.type);
  }
  if (options.featured) {
    query = query.eq('featured', true);
  }
  if (options.category) {
    query = query.eq('categories.slug', options.category);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as MediaItem[];
}

export async function getMediaBySlug(slug: string) {
  const { data, error } = await supabase
    .from('media')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data as MediaItem;
}

export async function getMediaById(id: number) {
  const { data, error } = await supabase
    .from('media')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as MediaItem;
}

export async function incrementViews(id: number) {
  const { error } = await supabase.rpc('increment_views', { media_id: id });
  if (error) throw error;
}

export async function searchMedia(query: string, type?: MediaItem['type']) {
  let q = supabase
    .from('media')
    .select('*, category:categories(*)')
    .or(`title_fr.ilike.%${query}%,title_mg.ilike.%${query}%,description_fr.ilike.%${query}%,description_mg.ilike.%${query}%,speaker.ilike.%${query}%`)
    .order('featured', { ascending: false })
    .order('date', { ascending: false })
    .limit(50);

  if (type) {
    q = q.eq('type', type);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data as MediaItem[];
}

// ============================================================
// FONCTIONS CATÉGORIES
// ============================================================

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id');

  if (error) throw error;
  return data as Category[];
}

// ============================================================
// FONCTIONS VERSETS
// ============================================================

export async function getVerseOfDay() {
  const { data, error } = await supabase.rpc('get_verse_of_day');
  if (error) return null;
  return data as Verse | null;
}

export async function getVerses() {
  const { data, error } = await supabase
    .from('verses')
    .select('*')
    .order('id');

  if (error) throw error;
  return data as Verse[];
}

// ============================================================
// FONCTIONS CANTIQUES
// ============================================================

export async function getCantiques(lang: 'mg' | 'fr' | 'en' = 'mg') {
  const { data, error } = await supabase
    .from('cantiques')
    .select('*')
    .eq('lang', lang)
    .order('num');

  if (error) throw error;
  return data as Cantique[];
}

export async function getCantiqueById(id: string, lang: 'mg' | 'fr' | 'en' = 'mg') {
  const { data, error } = await supabase
    .from('cantiques')
    .select('*')
    .eq('id', id)
    .eq('lang', lang)
    .single();

  if (error) return null;
  return data as Cantique;
}

export async function getCantiquesWithPlayback(lang: 'mg' | 'fr' | 'en' = 'mg') {
  const { data, error } = await supabase
    .from('cantiques')
    .select('*')
    .eq('lang', lang)
    .not('playback', 'is', null)
    .order('num');

  if (error) throw error;
  return data as Cantique[];
}

// ============================================================
// FONCTIONS MOFONAINA
// ============================================================

export async function getMofonaina() {
  const { data, error } = await supabase
    .from('mofonaina')
    .select('*')
    .order('date');

  if (error) throw error;
  return data as MofonainaDay[];
}

export async function getMeditationForDate(date?: string) {
  if (!date) {
    const today = new Date();
    date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  // Essayer de trouver la méditation pour la date
  const { data: found } = await supabase
    .from('mofonaina')
    .select('*')
    .eq('date', date)
    .single();

  if (found) return found as MofonainaDay;

  // Sinon, prendre la première disponible
  const { data, error } = await supabase
    .from('mofonaina')
    .select('*')
    .order('date')
    .limit(1)
    .single();

  if (error) return null;
  return data as MofonainaDay | null;
}

// ============================================================
// FONCTIONS ADMIN - CRUD MEDIA
// ============================================================

export async function createMedia(item: Partial<MediaItem> & { title_fr: string; type: MediaItem['type'] }) {
  const { data, error } = await supabase
    .from('media')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data as MediaItem;
}

export async function updateMedia(id: number, item: Partial<MediaItem>) {
  const { data, error } = await supabase
    .from('media')
    .update(item)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as MediaItem;
}

export async function deleteMedia(id: number) {
  const { error } = await supabase
    .from('media')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// FONCTIONS ADMIN - GESTION UTILISATEURS
// ============================================================

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*, role:roles(*)')
    .order('created_at');

  if (error) throw error;
  return data as User[];
}

export async function updateUser(id: string, updates: Partial<User>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

export async function getRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name');

  if (error) throw error;
  return data as Role[];
}

// ============================================================
// STATISTIQUES
// ============================================================

export async function getStats() {
  const [
    { count: sermons },
    { count: courses },
    { count: audio },
    { count: seminars },
    { count: conferences },
    { count: articles },
    { count: cantiquesMg },
    { count: cantiquesFr },
    { count: cantiquesEn },
    { count: meditations }
  ] = await Promise.all([
    supabase.from('media').select('*', { count: 'exact', head: true }).eq('type', 'sermon'),
    supabase.from('media').select('*', { count: 'exact', head: true }).eq('type', 'course'),
    supabase.from('media').select('*', { count: 'exact', head: true }).eq('type', 'audio'),
    supabase.from('media').select('*', { count: 'exact', head: true }).eq('type', 'seminar'),
    supabase.from('media').select('*', { count: 'exact', head: true }).eq('type', 'conference'),
    supabase.from('media').select('*', { count: 'exact', head: true }).eq('type', 'article'),
    supabase.from('cantiques').select('*', { count: 'exact', head: true }).eq('lang', 'mg'),
    supabase.from('cantiques').select('*', { count: 'exact', head: true }).eq('lang', 'fr'),
    supabase.from('cantiques').select('*', { count: 'exact', head: true }).eq('lang', 'en'),
    supabase.from('mofonaina').select('*', { count: 'exact', head: true })
  ]);

  return {
    sermons: sermons || 0,
    courses: courses || 0,
    audio: audio || 0,
    seminars: seminars || 0,
    conferences: conferences || 0,
    articles: articles || 0,
    cantiques: {
      mg: cantiquesMg || 0,
      fr: cantiquesFr || 0,
      en: cantiquesEn || 0
    },
    meditations: meditations || 0
  };
}
