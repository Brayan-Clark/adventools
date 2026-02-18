import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AppSettings = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  scalingFactor: number;
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
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
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
