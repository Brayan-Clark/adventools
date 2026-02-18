import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Image, Alert, Linking } from 'react-native';
import {
  User, Bell, Shield, CircleHelp, LogOut, ChevronRight, Globe, Moon, Sun, Lock,
  FileText, ChevronLeft, Camera, Heart, Info, Type, Save, Download, RefreshCcw
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/lib/settings-context';
import { exportHymnCorrections, importHymnCorrections } from '@/lib/backup-utils';

export default function Settings() {
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('Français');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const darkMode = await AsyncStorage.getItem('settings_darkMode');
      const notifs = await AsyncStorage.getItem('settings_notifications');
      const lang = await AsyncStorage.getItem('settings_language');

      if (darkMode !== null) setIsDarkMode(darkMode === 'true');
      if (notifs !== null) setNotifications(notifs === 'true');
      if (lang !== null) setLanguage(lang);
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(`settings_${key}`, String(value));
    } catch (e) {
      console.error('Failed to save setting', e);
    }
  };

  const handleDarkModeToggle = (value: boolean) => {
    setIsDarkMode(value);
    saveSetting('darkMode', value);
  };

  const handleNotificationsToggle = (value: boolean) => {
    setNotifications(value);
    saveSetting('notifications', value);
  };

  const handleClearHistory = async () => {
    Alert.alert(
      'Effacer l\'historique',
      'Voulez-vous effacer tout l\'historique de lecture ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('app_history');
            Alert.alert('Succès', 'Historique effacé');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-800/50">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center border border-slate-700">
          <ChevronLeft size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>Paramètres</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <View className="items-center mb-8">
          <View className="relative mb-4">
            <View className="w-24 h-24 rounded-full bg-slate-900 border-4 border-slate-800 items-center justify-center">
              <User size={48} color="#475569" />
            </View>
            <TouchableOpacity className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center border-4 border-background-dark">
              <Camera size={14} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Lexend_700Bold' }}>Étudiant Biblique</Text>
          <Text className="text-slate-500 text-sm">Prêt pour une nouvelle étude ?</Text>
        </View>

        {/* Categories */}
        <SettingsGroup title="Préférences">
          <SettingItem
            icon={<Moon size={18} color="#64748b" />}
            label="Mode Sombre"
            rightElement={<Switch value={isDarkMode} onValueChange={handleDarkModeToggle} trackColor={{ false: '#334155', true: '#195de6' }} />}
          />
          <SettingItem
            icon={<Bell size={18} color="#64748b" />}
            label="Notifications"
            rightElement={<Switch value={notifications} onValueChange={handleNotificationsToggle} trackColor={{ false: '#334155', true: '#195de6' }} />}
          />
          <SettingItem
            icon={<Globe size={18} color="#64748b" />}
            label="Langue"
            value={language}
            onPress={() => Alert.alert('Langue', 'Choix de langue bientôt disponible')}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title="Contenu">
          <SettingItem
            icon={<FileText size={18} color="#64748b" />}
            label="Version de Bible par défaut"
            value="Baiboly Malagasy"
            onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
          />
          <SettingItem
            icon={<Type size={18} color="#64748b" />}
            label="Paramètres de lecture"
            onPress={() => router.push('/bible/settings' as any)}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title="Données & Sauvegarde">
          <SettingItem
            icon={<Save size={18} color="#64748b" />}
            label="Exporter les corrections"
            value="Vers fichier JSON"
            onPress={exportHymnCorrections}
          />
          <SettingItem
            icon={<Download size={18} color="#64748b" />}
            label="Importer des corrections"
            onPress={importHymnCorrections}
          />
          <SettingItem
            icon={<RefreshCcw size={18} color="#f87171" />}
            label="Réinitialiser l'historique"
            onPress={handleClearHistory}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title="Support">
          <SettingItem
            icon={<Info size={18} color="#64748b" />}
            label="À Propos d'Adventools"
            onPress={() => router.push('/settings/about' as any)}
          />
          <SettingItem
            icon={<Heart size={18} color="#ef4444" />}
            label="Faire un Don"
            onPress={() => router.push('/settings/don' as any)}
          />
          <SettingItem
            icon={<CircleHelp size={18} color="#64748b" />}
            label="Centre d'aide"
            onPress={() => Alert.alert('Support', 'Contactez-nous à contact@adventools.com')}
          />
          <SettingItem
            icon={<Shield size={18} color="#64748b" />}
            label="Politique de confidentialité"
            onPress={() => Alert.alert('Confidentialité', 'Vos données sont stockées localement sur votre appareil.')}
            isLast
          />
        </SettingsGroup>

        <TouchableOpacity
          onPress={() => Alert.alert('Déconnexion', 'Bientôt disponible')}
          className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex-row items-center justify-center mb-10"
        >
          <LogOut size={18} color="#f87171" className="mr-2" />
          <Text className="text-red-400 font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>Se déconnecter</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <View className="mb-8">
      <Text className="text-[10px] font-bold uppercase text-slate-500 mb-3 ml-2 tracking-widest">{title}</Text>
      <View className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {children}
      </View>
    </View>
  );
}

function SettingItem({ icon, label, onPress, rightElement, value, isLast }: any) {
  const Container = onPress ? TouchableOpacity : View;
  const { settings: globalSettings } = useSettings();

  return (
    <Container
      onPress={onPress}
      className={`flex-row items-center p-4 pl-5 ${!isLast ? 'border-b border-slate-800/50' : ''} bg-slate-900 active:bg-slate-800`}
    >
      <View className="w-8 items-center mr-3">{icon}</View>
      <Text className="flex-1 text-slate-200 font-medium text-sm" style={{
        fontFamily: globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily
      }}>{label}</Text>
      {value && <Text className="text-slate-500 text-xs mr-2">{value}</Text>}
      {rightElement ? rightElement : <ChevronRight size={16} color="#475569" />}
    </Container>
  );
}
