import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as FileSystem from 'expo-file-system/legacy';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * US-03: Shared file utility — avoids code duplication between notes.tsx and lesona.tsx.
 * Copies a temporary media file to the permanent app document directory.
 */
export const saveFilePermanently = async (
  uri: string,
  type: 'image' | 'voice' | 'video'
): Promise<string> => {
  try {
    const docDir = FileSystem.documentDirectory;
    if (!docDir) return uri;

    const notesDir = `${docDir}adventools_notes/`;
    const dirInfo = await FileSystem.getInfoAsync(notesDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(notesDir, { intermediates: true });
    }
    const ext = uri.split('.').pop() || 'tmp';
    const filename = `${type}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    const newUri = `${notesDir}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: newUri });
    return newUri;
  } catch (e) {
    console.error('[utils] Failed to save file permanently', e);
    return uri;
  }
};

/**
 * Robustly cleans SSPM markdown and special tags for display.
 */
export const cleanSspmMarkdown = (md: string) => {
  if (!md) return "";
  return md
    // Strip SSPM style tags like ^[Text]({"style":...}) and keep the text bold
    .replace(/\\?\^?\[([^\]]+)\]\(\s*\{[^)]*\}\s*\)/g, '**$1**')
    .replace(/\\\\\n/g, '\n')
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\{#.*?\}/g, '')
    .replace(/Lesona faha/gi, 'Herinandro')
    .replace(/Leçon\s*(?=\d)/gi, 'Semaine ')
    .replace(/Lesson\s*(?=\d)/gi, 'Week ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Strips all markdown artifacts (links, images, etc.) to produce clean plain text.
 * Used for sharing and journal notes.
 */
export const stripMarkdownLinks = (md: string) => {
  if (!md) return "";
  return cleanSspmMarkdown(md)
    // Strip SSPM object-style links: [text]({...})
    .replace(/\\?(\^)?\[([^\]]+)\]\(\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})\s*\)/g, '$2')
    // Strip standard markdown links: [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Strip image links: ![alt](url) → ''
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '');
};



/**
 * Parses various date formats to a Date object.
 */
export const parseDate = (dStr: string) => {
  if (!dStr || typeof dStr !== 'string') return new Date(0);
  const dateStr = dStr.split(' ')[0];
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
  }
  return new Date(dateStr);
};

/**
 * Formats a date range for display.
 */
export const formatDateRange = (start: string | undefined, end: string | undefined) => {
  if (!start || !end || typeof start !== 'string' || typeof end !== 'string') return "";
  try {
    const sParts = start.split('/');
    const eParts = end.split('/');
    if (sParts.length < 3 || eParts.length < 3) return "";
    return `${sParts.slice(1).join('/')} — ${eParts.slice(1).join('/')}`;
  } catch (e) {
    return "";
  }
};
