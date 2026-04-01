import React from 'react';
import { I18nManager } from './i18n-manager';
import { en } from './i18n/en';
import { fr } from './i18n/fr'; // fr is static default
import { mg } from './i18n/mg';
import { de } from './i18n/de';
import { es } from './i18n/es';
import { pt } from './i18n/pt';
import { zh } from './i18n/zh';
import { Language, TranslationKey, TranslationSchema } from './i18n/types';
import { useSettings } from './settings-context';

export { Language, TranslationKey, TranslationSchema };

/**
 * Static local translations
 */
export const staticTranslations: Record<Language, TranslationSchema> = {
  Français: fr,
  English: en,
  Malagasy: mg,
  Deutsch: de,
  Español: es,
  Português: pt,
  '中文': zh,
};

/**
 * Hook to use translations in components.
 * Consumes the language from global settings.
 */
export function useTranslation() {
  const { settings } = useSettings();
  const currentLang = (settings.language as Language) || 'Français';
  const manager = I18nManager.getInstance();

  // Reference for force-update if dynamic translations load
  const [_, setTick] = React.useState(0);

  React.useEffect(() => {
    // Initial load
    manager.init().then(() => setTick(t => t + 1));
  }, []);

  /**
   * Translates a key based on current language.
   * Falls back to French if the key is missing in the target language.
   */
  const t = (key: TranslationKey): string => {
    const all = manager.getTranslations();
    const langSet = all[currentLang] || all.Français || fr;
    return (langSet as any)[key] || (fr as any)[key] || key;
  };

  const setLanguage = (lang: Language) => {
    // Note: Actual language update should be done via SettingsContext
    return lang;
  };

  const syncRemoteManifest = async () => {
    return await manager.syncRemoteManifest();
  };

  const getLanguageStatus = (id: string) => {
    return manager.getLanguageStatus(id);
  };

  const downloadLanguage = async (id: string) => {
    const success = await manager.downloadLanguage(id);
    if (success) setTick(t => t + 1);
    return success;
  };

  const removeLanguage = async (id: string) => {
    const success = await manager.removeLanguage(id);
    if (success) setTick(t => t + 1);
    return success;
  };

  const getInstalledLanguages = () => {
    return manager.getInstalledLanguages();
  };

  const getRemoteAvailableLanguages = () => {
    return manager.getRemoteAvailableLanguages();
  };

  return {
    t,
    currentLang,
    setLanguage,
    syncRemoteManifest,
    getLanguageStatus,
    downloadLanguage,
    removeLanguage,
    getInstalledLanguages,
    getRemoteAvailableLanguages
  };
}
