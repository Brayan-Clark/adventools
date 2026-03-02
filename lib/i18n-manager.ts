import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { staticTranslations } from './i18n';
import { Language, TranslationSchema } from './i18n/types';

const MANIFEST_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/i18n/manifest.json';
const I18N_DIR = `${FileSystem.documentDirectory}i18n/`;
const REMOTE_MANIFEST_CACHE_KEY = 'adventools_i18n_remote_manifest';
const LOCAL_MANIFEST_KEY = 'adventools_i18n_local_manifest';

export interface I18nManifest {
  versionCode: number;
  lastUpdate: string;
  languages: {
    id: Language | string;
    file: string;
    name: string;
    version: number;
  }[];
}

export type LanguageStatus = 'built-in' | 'downloaded' | 'update-available' | 'not-downloaded';

export class I18nManager {
  private static instance: I18nManager;
  private dynamicTranslations: Record<string, TranslationSchema> = {};
  private localManifest: I18nManifest | null = null;
  private remoteManifest: I18nManifest | null = null;

  private constructor() { }

  static getInstance(): I18nManager {
    if (!I18nManager.instance) {
      I18nManager.instance = new I18nManager();
    }
    return I18nManager.instance;
  }

  async init() {
    try {
      const info = await FileSystem.getInfoAsync(I18N_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(I18N_DIR, { intermediates: true });
      }

      // Load remote manifest cache
      const cachedRemote = await AsyncStorage.getItem(REMOTE_MANIFEST_CACHE_KEY);
      if (cachedRemote) this.remoteManifest = JSON.parse(cachedRemote);

      // Load local manifest
      const storedLocal = await AsyncStorage.getItem(LOCAL_MANIFEST_KEY);
      if (storedLocal) {
        this.localManifest = JSON.parse(storedLocal);
        await this.loadStoredTranslations();
      }
    } catch (e) {
      console.error('I18n init error', e);
    }
  }

  private async loadStoredTranslations() {
    if (!this.localManifest) return;
    for (const lang of this.localManifest.languages) {
      const filePath = `${I18N_DIR}${lang.file}`;
      if ((await FileSystem.getInfoAsync(filePath)).exists) {
        try {
          const content = await FileSystem.readAsStringAsync(filePath);
          this.dynamicTranslations[lang.id] = JSON.parse(content);
        } catch (e) { console.error(`Error loading stored lang: ${lang.id}`, e); }
      }
    }
  }

  getTranslations(): Record<string, TranslationSchema> {
    const all: Record<string, TranslationSchema> = { ...staticTranslations };
    Object.keys(this.dynamicTranslations).forEach(key => {
      all[key] = { ...all[key], ...this.dynamicTranslations[key] };
    });
    return all;
  }

  async syncRemoteManifest(): Promise<I18nManifest | null> {
    try {
      const resp = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
      if (!resp.ok) return this.remoteManifest;
      const json = await resp.json();
      this.remoteManifest = json;
      await AsyncStorage.setItem(REMOTE_MANIFEST_CACHE_KEY, JSON.stringify(json));
      return json;
    } catch (e) { return this.remoteManifest; }
  }

  getLanguageStatus(id: string): LanguageStatus {
    if (id === 'Français' || id === 'English' || id === 'Malagasy') return 'built-in';

    const local = this.localManifest?.languages.find(l => l.id === id);
    const remote = this.remoteManifest?.languages.find(l => l.id === id);

    if (!local) return 'not-downloaded';
    if (remote && remote.version > local.version) return 'update-available';
    return 'downloaded';
  }

  async downloadLanguage(id: string): Promise<boolean> {
    if (!this.remoteManifest) return false;
    const remoteLang = this.remoteManifest.languages.find(l => l.id === id);
    if (!remoteLang) return false;

    try {
      const filePath = `${I18N_DIR}${remoteLang.file}`;
      const url = `https://raw.githubusercontent.com/Brayan-Clark/adventools/data/i18n/${remoteLang.file}`;
      const download = await FileSystem.downloadAsync(url, filePath);

      if (download.status === 200) {
        const content = await FileSystem.readAsStringAsync(filePath);
        this.dynamicTranslations[id] = JSON.parse(content);

        // Update local manifest
        if (!this.localManifest) {
          this.localManifest = { ...this.remoteManifest, languages: [] };
        }

        this.localManifest.languages = this.localManifest.languages.filter(l => l.id !== id);
        this.localManifest.languages.push(remoteLang);
        await AsyncStorage.setItem(LOCAL_MANIFEST_KEY, JSON.stringify(this.localManifest));
        return true;
      }
      return false;
    } catch (e) {
      console.error(`Download error for ${id}`, e);
      return false;
    }
  }

  async removeLanguage(id: string): Promise<boolean> {
    const status = this.getLanguageStatus(id);
    if (status === 'built-in' || !this.localManifest) return false;

    try {
      const lang = this.localManifest.languages.find(l => l.id === id);
      if (lang) {
        await FileSystem.deleteAsync(`${I18N_DIR}${lang.file}`, { idempotent: true });
        delete this.dynamicTranslations[id];
        this.localManifest.languages = this.localManifest.languages.filter(l => l.id !== id);
        await AsyncStorage.setItem(LOCAL_MANIFEST_KEY, JSON.stringify(this.localManifest));
        return true;
      }
      return false;
    } catch (e) { return false; }
  }

  getInstalledLanguages(): { id: string; name: string; isBuiltIn: boolean }[] {
    const langs = Object.keys(staticTranslations).map(id => ({ id, name: id, isBuiltIn: true }));
    if (this.localManifest) {
      this.localManifest.languages.forEach(l => {
        if (!langs.find(el => el.id === l.id)) {
          langs.push({ id: l.id, name: l.name, isBuiltIn: false });
        }
      });
    }
    return langs;
  }

  getRemoteAvailableLanguages(): I18nManifest['languages'] {
    return this.remoteManifest?.languages || [];
  }
}
