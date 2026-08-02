import fs from 'node:fs';
import path from 'node:path';

// --- Chemins -------------------------------------------------------------
// Les JSON sont servis statiquement depuis public/data (fetch côté client)
// et lus depuis data/ (ou public/data) côté serveur (SSR).
const DATA_DIR = process.env.ANDEAHA_DATA_DIR
  ? path.resolve(process.env.ANDEAHA_DATA_DIR)
  : path.join(process.cwd(), 'data');
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');

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
}

export interface MofonainaDay {
  date: string;
  titre_du_jour: string;
  verset_texte: string;
  verset_reference: string;
  contenu?: string;
  content?: string;
  source?: string;
}

export interface Mofonaina {
  trimestre?: { annee?: number; numero_trimestre?: number; titre_principal?: string };
  meditations: MofonainaDay[];
}

let _mg: Cantique[] | null = null;
let _fr: Cantique[] | null = null;
let _en: Cantique[] | null = null;
let _mofonaina: Mofonaina | null = null;

function loadJson<T>(file: string, fallback: T): T {
  for (const dir of [DATA_DIR, PUBLIC_DATA_DIR]) {
    try {
      const p = path.join(dir, file);
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
      }
    } catch {
      /* on essaie le chemin suivant */
    }
  }
  return fallback;
}

export function getCantiquesMg(): Cantique[] {
  if (_mg) return _mg;
  _mg = loadJson<Cantique[]>('cantiques_mg.json', []);
  return _mg;
}

export function getCantiquesFr(): Cantique[] {
  if (_fr) return _fr;
  _fr = loadJson<Cantique[]>('cantiques_fr.json', []);
  return _fr;
}

export function getCantiquesEn(): Cantique[] {
  if (_en) return _en;
  _en = loadJson<Cantique[]>('cantiques_en.json', []);
  return _en;
}

export function getCantiqueById(id: string, lang: 'mg' | 'fr' | 'en'): Cantique | null {
  const list = lang === 'mg' ? getCantiquesMg() : lang === 'fr' ? getCantiquesFr() : getCantiquesEn();
  return list.find((c) => c.id === id) ?? null;
}


export function getMofonaina(): Mofonaina {
  if (_mofonaina) return _mofonaina;
  _mofonaina = loadJson<Mofonaina>('mofonaina.json', { meditations: [] });
  return _mofonaina;
}

/** Méditation du jour : recherche par date YYYY-MM-DD, sinon première disponible. */
export function getMeditationForDate(date?: string): MofonainaDay | null {
  const meds = getMofonaina().meditations;
  if (!meds.length) return null;
  if (date) {
    const found = meds.find((m) => m.date === date);
    if (found) return found;
  }
  // Date du jour (heure locale)
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const t = meds.find((m) => m.date === iso);
  if (t) return t;
  return meds[0];
}

export function cantiqueStats() {
  return {
    mg: getCantiquesMg().length,
    fr: getCantiquesFr().length,
    en: getCantiquesEn().length,
    mgAudio: getCantiquesMg().filter((c) => c.playback).length,
    enAudio: getCantiquesEn().filter((c) => c.playback).length,
    meditations: getMofonaina().meditations.length,
  };
}

/**
 * Transforme une URL audio en URL de lecture directe.
 * Les liens Google Drive forcent le téléchargement (Content-Disposition:
 * attachment) ; on les route via le proxy /api/stream qui renvoie le flux
 * en inline pour que l'élément <audio> puisse jouer.
 */
export function playbackSrc(url?: string): string {
  if (!url) return '';
  const m = url.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (m && /drive\.google\.com|drive\.usercontent\.google\.com|docs\.google\.com/i.test(url)) {
    return `/api/stream?id=${m[1]}`;
  }
  return url;
}
