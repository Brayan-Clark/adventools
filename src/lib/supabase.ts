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
    })
  : createClient('https://placeholder.supabase.co', 'placeholder', {
      auth: { persistSession: false },
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

// Catégories, médias, leçons et versets ont une seule définition, dans
// `types.ts`. Ce fichier en dupliquait une variante plus stricte (colonnes
// malgaches non nullables, `category_id` numérique obligatoire) : les deux
// types portaient le même nom et ne se mélangeaient pas, ce qui rendait
// l'admin intypable.
export type { Category, Lesson, MediaItem, Verse, MediaType } from './types';
import type { Category, MediaItem, Verse } from './types';

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

  // AUTO-VALIDATION : si le compte existe dans Supabase auth mais n'a pas encore
  // de profil (créé via le dashboard), on crée son profil au premier login.
  // Le rôle est NULL → aucun accès tant qu'un admin ne l'a pas activé.
  if (!userProfile && user.email) {
    const { data: created } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? user.email.split('@')[0],
        role_id: null,
        is_active: true
      })
      .select('*, role:roles(*)')
      .single();

    if (created) return created as User;
    // Si l'insertion échoue (profil déjà créé entre-temps), on re-lit
    const { data: retry } = await supabase
      .from('users')
      .select('*, role:roles(*)')
      .eq('id', user.id)
      .single();
    return retry as User | null;
  }

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

/** Création d'une catégorie. Réservé aux administrateurs par RLS. */
export async function createCategory(payload: Partial<Category>) {
  const { data, error } = await supabase.from('categories').insert(payload).select().single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(id: number, payload: Partial<Category>) {
  const { data, error } = await supabase.from('categories').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: number) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
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

export async function createVerse(payload: Partial<Verse>) {
  const { data, error } = await supabase.from('verses').insert(payload).select().single();
  if (error) throw error;
  return data as Verse;
}

export async function updateVerse(id: number, payload: Partial<Verse>) {
  const { data, error } = await supabase.from('verses').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as Verse;
}

export async function deleteVerse(id: number) {
  const { error } = await supabase.from('verses').delete().eq('id', id);
  if (error) throw error;
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

/**
 * Transforme un titre en identifiant d'URL : minuscules, sans accents, tirets.
 * `media.slug` est `UNIQUE NOT NULL` en base ; le formulaire d'administration
 * ne le renseignait pas du tout, donc **toute création échouait**.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Rend un slug unique en lui ajoutant un suffixe numérique si besoin.
 * `excludeId` évite qu'un contenu entre en conflit avec lui-même à la mise à jour.
 */
export async function uniqueSlug(base: string, excludeId?: number | null): Promise<string> {
  const root = slugify(base) || `contenu-${Date.now().toString(36)}`;
  const { data } = await supabase.from('media').select('id, slug').like('slug', `${root}%`);
  const taken = new Set(
    (data ?? []).filter((r: { id: number }) => r.id !== excludeId).map((r: { slug: string }) => r.slug)
  );
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) {
    if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
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

/**
 * Compte les lignes d'un type de média. Chaque compteur est isolé : une table
 * absente ou une base injoignable renvoie 0 au lieu de faire échouer tout le
 * bloc de statistiques (l'ancien Promise.all vidait la page entière dès qu'une
 * seule requête échouait).
 */
async function countMedia(type: MediaItem['type']): Promise<number> {
  try {
    const { count } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true })
      .eq('type', type);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getStats() {
  const [sermons, courses, audio, seminars, conferences, articles] = await Promise.all([
    countMedia('sermon'),
    countMedia('course'),
    countMedia('audio'),
    countMedia('seminar'),
    countMedia('conference'),
    countMedia('article'),
  ]);

  return { sermons, courses, audio, seminars, conferences, articles };
}
