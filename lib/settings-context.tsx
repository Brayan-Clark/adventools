import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type AppSettings = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  scalingFactor: number;
  bibleVersion: string;
  language: string;
  darkMode: boolean;
  notifications: boolean;
  downloadOverWifiOnly: boolean;
  updateCheckIntervalMonths: number;
};

type SettingsContextType = {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  isLoading: boolean;
};

const DEFAULT_SETTINGS: AppSettings = {
  fontFamily: 'System',
  fontSize: 18,
  lineHeight: 1.5,
  letterSpacing: 0,
  scalingFactor: 1,
  bibleVersion: 'MG',
  language: 'Français',
  darkMode: true,
  notifications: true,
  downloadOverWifiOnly: true, // Default to Wi-Fi only for safety
  updateCheckIntervalMonths: 1, // Default to 1 month
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('app_global_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      }
    } catch (e) {
      console.error('Failed to load global settings', e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      await AsyncStorage.setItem('app_global_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save global settings', e);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
