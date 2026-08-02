import type { MediaType } from './types';

export function typePath(type: MediaType): string {
  switch (type) {
    case 'sermon':
      return '/sermons';
    case 'course':
      return '/cours';
    case 'audio':
      return '/audio';
    case 'seminar':
      return '/seminaires';
    case 'conference':
      return '/conferences';
    case 'article':
      return '/articles';
  }
}

export function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

export function formatDate(iso?: string, lang: 'fr' | 'mg' = 'fr'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'mg' ? 'mg-MG' : 'fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return raw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
}

export function parseLessons(raw: string | null | undefined) {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
