export type MediaType = 'sermon' | 'course' | 'audio' | 'seminar' | 'conference' | 'article';

export interface Category {
  id: number;
  slug: string;
  name_fr: string;
  name_mg: string;
  icon: string;
  color: string;
}

export interface Lesson {
  id?: number;
  title_fr: string;
  title_mg: string;
  video_url?: string;
  audio_url?: string;
  duration?: string;
}

export interface MediaItem {
  id: number;
  type: MediaType;
  slug: string;
  title_fr: string;
  title_mg: string | null;
  description_fr: string;
  description_mg: string | null;
  /** Corps de l'article (texte long, markdown simple) */
  content_fr?: string;
  content_mg?: string;
  speaker?: string;
  image?: string;
  video_url?: string;
  audio_url?: string;
  duration?: string;
  date?: string;
  category_id?: number | null;
  category?: Category;
  tags?: string[];
  /** booléen en sortie API (mapRow) ; 0/1 en SQL */
  featured?: boolean;
  views?: number;
  lessons?: Lesson[];
  created_at?: string;
}

export interface Verse {
  id: number;
  text_fr: string;
  text_mg: string;
  reference: string;
}

export interface Settings {
  site_name?: string;
  tagline_fr?: string;
  tagline_mg?: string;
  contact_email?: string;
  /** Sensible — jamais exposé via l'API publique (filtré dans /api/content) */
  admin_password?: string;
}

export interface ContentBundle {
  categories: Category[];
  media: MediaItem[];
  settings: Settings;
  verse: Verse | null;
  updated_at: string;
}

export type Lang = 'fr' | 'mg';
