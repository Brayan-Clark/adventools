import { loadDatabase } from './database';
import localManifest from '@/assets/hymnes/manifest.json';

export interface HymnConfig {
  id: string;
  name: string;
  language: string;
  file: string;
  url: string;
  size: string;
  isDefault?: boolean;
}

export const getHymnConfigs = (): HymnConfig[] => {
  return localManifest.versions;
};

export const getRemoteHymnManifest = async (): Promise<HymnConfig[]> => {
  try {
    const GITHUB_URL = `https://raw.githubusercontent.com/Brayan-Clark/adventools/data/assets/hymnes/manifest.json?t=${Date.now()}`;
    const response = await fetch(GITHUB_URL);
    if (response.ok) {
      const data = await response.json();
      return data.versions;
    }
  } catch (e) {
    console.log("Hymn manifest sync failed");
  }
  return localManifest.versions;
};
