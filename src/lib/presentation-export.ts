/**
 * Export / Import de présentations (projecteur) au format ZIP.
 *
 * - Les présentations sont stockées en localStorage (clés : ah-pres-*)
 * - Les fichiers locaux (images, vidéos, audio) ajoutés par l'utilisateur
 *   sont stockés dans IndexedDB (clés : ah-file-*)
 * - L'export ZIP contient : presentations.json + tous les fichiers
 * - L'import restaure les présentations et les fichiers
 */
import JSZip from 'jszip';

// Clés localStorage
const STORAGE_PREFIX = 'ah-pres-';
const FILE_DB_NAME = 'AndeahaPresentationFiles';
const FILE_STORE = 'files';
const META_KEY = 'ah-pres-meta'; // liste des noms de présentations

interface PresentationFile {
  id: string;
  name: string;
  type: string;
  data: string; // base64
}

// ── IndexedDB helpers ──

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FILE_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(FILE_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeFile(id: string, name: string, type: string, data: ArrayBuffer) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readwrite');
    tx.objectStore(FILE_STORE).put({ id, name, type, data: arrayBufferToBase64(data) });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getFile(id: string): Promise<PresentationFile | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readonly');
    const req = tx.objectStore(FILE_STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function getAllFiles(): Promise<PresentationFile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readonly');
    const req = tx.objectStore(FILE_STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function clearFiles() {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readwrite');
    tx.objectStore(FILE_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Base64 helpers ──

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ── Export ZIP ──

export async function exportPresentationsZip(): Promise<Blob> {
  const zip = new JSZip();

  // 1. Récupérer toutes les présentations depuis localStorage
  const presentations: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      try {
        presentations[key] = JSON.parse(localStorage.getItem(key)!);
      } catch { /* ignore */ }
    }
  }
  // Meta (noms de présentations)
  const meta = localStorage.getItem(META_KEY);
  if (meta) presentations[META_KEY] = JSON.parse(meta);

  zip.file('presentations.json', JSON.stringify(presentations, null, 2));

  // 2. Récupérer tous les fichiers depuis IndexedDB
  const files = await getAllFiles();
  const filesFolder = zip.folder('files')!;

  for (const f of files) {
    filesFolder.file(`${f.id}_${f.name}`, base64ToArrayBuffer(f.data));
  }

  // 3. Manifeste d'import
  const manifest = {
    exported_at: new Date().toISOString(),
    presentation_count: Object.keys(presentations).length - (meta ? 1 : 0),
    file_count: files.length,
    app: 'Andeaha Hizaha',
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export async function downloadZip() {
  const blob = await exportPresentationsZip();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `andeaha-presentations-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Import ZIP ──

export async function importPresentationsZip(file: File): Promise<{ presentations: number; files: number }> {
  const zip = await JSZip.loadAsync(file);
  let presentationsCount = 0;
  let filesCount = 0;

  // 1. Restaurer les présentations dans localStorage
  const presFile = zip.file('presentations.json');
  if (presFile) {
    const presentations = JSON.parse(await presFile.async('text'));
    for (const [key, value] of Object.entries(presentations)) {
      localStorage.setItem(key, JSON.stringify(value));
      if (key !== META_KEY) presentationsCount++;
    }
  }

  // 2. Restaurer les fichiers dans IndexedDB
  const filesFolder = zip.folder('files');
  if (filesFolder) {
    for (const [name, entry] of Object.entries(filesFolder.files)) {
      if (entry.dir) continue;
      const buffer = await entry.async('arraybuffer');
      // Extraire l'id et le nom original (format: id_nom)
      const underscoreIdx = name.indexOf('_');
      const id = underscoreIdx > 0 ? name.slice(0, underscoreIdx) : name;
      const originalName = underscoreIdx > 0 ? name.slice(underscoreIdx + 1) : name;

      // Deviner le type MIME depuis l'extension
      const ext = originalName.split('.').pop()?.toLowerCase() ?? '';
      const mimeMap: Record<string, string> = {
        mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg',
        mp3: 'audio/mpeg', wav: 'audio/wav',
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
        pdf: 'application/pdf',
      };
      const mimeType = mimeMap[ext] ?? 'application/octet-stream';

      await storeFile(id, originalName, mimeType, buffer);
      filesCount++;
    }
  }

  return { presentations: presentationsCount, files: filesCount };
}

// ── File input helper ──

export async function addFileFromInput(input: HTMLInputElement): Promise<string | null> {
  const file = input.files?.[0];
  if (!file) return null;

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const buffer = await file.arrayBuffer();
  await storeFile(id, file.name, file.type, buffer);
  return id;
}

export async function getFileUrl(fileId: string): Promise<string | null> {
  const file = await getFile(fileId);
  if (!file) return null;
  const blob = new Blob([base64ToArrayBuffer(file.data)], { type: file.type });
  return URL.createObjectURL(blob);
}

export async function clearAllPresentations() {
  // Supprimer toutes les clés localStorage de présentations
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX) || key === META_KEY) {
      keys.push(key);
    }
  }
  keys.forEach((k) => localStorage.removeItem(k));
  await clearFiles();
}
