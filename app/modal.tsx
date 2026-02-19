import localManifest from '@/assets/docs/manifest.json';
import { exportHymnCorrections, importHymnCorrections, resetHymnCorrections } from '@/lib/backup-utils';
import { useSettings } from '@/lib/settings-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  Globe,
  Heart, Info,
  Moon,
  RefreshCcw,
  Save,
  Shield,
  Type,
  User
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Settings() {
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('Français');
  const [userName, setUserName] = useState('Fianatra Baiboly');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userDepartments, setUserDepartments] = useState<string[]>([]);
  const [isDeptModalVisible, setIsDeptModalVisible] = useState(false);
  const [isNameEditVisible, setIsNameEditVisible] = useState(false);
  const [tempName, setTempName] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(localManifest.departments || []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    syncDepartments();
  }, []);

  const syncDepartments = async () => {
    try {
      const GITHUB_MANIFEST_URL = `https://raw.githubusercontent.com/Brayan-Clark/adventools/main/assets/docs/manifest.json?t=${Date.now()}`;
      const response = await fetch(GITHUB_MANIFEST_URL);
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData.departments) {
          setAvailableDepartments(remoteData.departments);
        }
      }
    } catch (e) {
      console.log("Using local departments list");
    }
  };

  const loadSettings = async () => {
    try {
      const darkMode = await AsyncStorage.getItem('settings_darkMode');
      const notifs = await AsyncStorage.getItem('settings_notifications');
      const lang = await AsyncStorage.getItem('settings_language');
      const name = await AsyncStorage.getItem('profile_name');
      const image = await AsyncStorage.getItem('profile_image');
      const depts = await AsyncStorage.getItem('profile_departments');

      if (darkMode !== null) setIsDarkMode(darkMode === 'true');
      if (notifs !== null) setNotifications(notifs === 'true');
      if (lang !== null) setLanguage(lang);
      if (name !== null) setUserName(name);
      if (image !== null) setUserImage(image);
      if (depts !== null) setUserDepartments(JSON.parse(depts));
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setUserImage(uri);
      await AsyncStorage.setItem('profile_image', uri);
    }
  };

  const saveName = async () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      await AsyncStorage.setItem('profile_name', tempName.trim());
      setIsNameEditVisible(false);
    }
  };

  const toggleDepartment = async (dept: string) => {
    let newDepts;
    if (userDepartments.includes(dept)) {
      newDepts = userDepartments.filter(d => d !== dept);
    } else {
      newDepts = [...userDepartments, dept];
    }
    setUserDepartments(newDepts);
    await AsyncStorage.setItem('profile_departments', JSON.stringify(newDepts));
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
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center">
          <ChevronLeft size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>Paramètres</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <View className="items-center mb-10">
          <View className="relative mb-4">
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8} className="w-28 h-28 rounded-full bg-slate-900 border-4 border-slate-800 items-center justify-center overflow-hidden">
              {userImage ? (
                <Image source={{ uri: userImage }} className="w-full h-full" />
              ) : (
                <User size={56} color="#475569" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickImage}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary items-center justify-center border-4 border-background-dark shadow-lg"
            >
              <Camera size={14} color="white" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => {
              setTempName(userName);
              setIsNameEditVisible(true);
            }}
            className="items-center"
          >
            <Text className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Lexend_700Bold' }}>{userName}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsDeptModalVisible(true)}
            className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex-row items-center"
          >
            <Text className="text-slate-400 text-xs font-medium mr-2">
              {userDepartments.length > 0 ? userDepartments.slice(0, 2).join(', ') + (userDepartments.length > 2 ? '...' : '') : 'Ajouter mon département'}
            </Text>
            <ChevronRight size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <SettingsGroup title="Mon Compte">
          <SettingItem
            icon={<User size={18} color="#64748b" />}
            label="Modifier mon nom"
            value={userName}
            onPress={() => {
              setTempName(userName);
              setIsNameEditVisible(true);
            }}
          />
          <SettingItem
            icon={<Shield size={18} color="#64748b" />}
            label="Mes Départements"
            value={`${userDepartments.length} sélectionnés`}
            onPress={() => setIsDeptModalVisible(true)}
            isLast
          />
        </SettingsGroup>

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
            label="Réinitialiser les corrections"
            onPress={resetHymnCorrections}
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
      </ScrollView>

      {/* Name Edit Modal */}
      <Modal visible={isNameEditVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center px-6">
          <View className="bg-slate-900 border border-slate-800 rounded-[32px] p-6">
            <Text className="text-white font-bold text-lg mb-4" style={{ fontFamily: 'Lexend_700Bold' }}>Modifier votre nom</Text>
            <TextInput
              className="bg-slate-800 border border-slate-700 p-4 rounded-2xl text-white mb-6"
              value={tempName}
              onChangeText={setTempName}
              placeholder="Votre nom"
              placeholderTextColor="#64748b"
              autoFocus
            />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setIsNameEditVisible(false)} className="flex-1 p-4 rounded-2xl border border-slate-700 items-center">
                <Text className="text-slate-400 font-medium">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName} className="flex-1 p-4 rounded-2xl bg-primary items-center">
                <Text className="text-white font-bold">Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Department Selection Modal */}
      <Modal visible={isDeptModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] px-6 pt-8 pb-10 max-h-[80%] border-t border-slate-800">
            <View className="flex-row justify-between items-center mb-6 px-2">
              <View>
                <Text className="text-white text-2xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>Départements</Text>
                <Text className="text-slate-500 mt-1">Sélectionnez vos activités à l'église</Text>
              </View>
              <TouchableOpacity onPress={() => setIsDeptModalVisible(false)} className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center">
                <Check size={20} color="#3b82f6" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap gap-2 mb-10">
                {availableDepartments.map((dept) => {
                  const isSelected = userDepartments.includes(dept);
                  return (
                    <TouchableOpacity
                      key={dept}
                      onPress={() => toggleDepartment(dept)}
                      className={`px-4 py-3 rounded-2xl border ${isSelected ? 'bg-primary/10 border-primary' : 'bg-slate-800/50 border-slate-800'}`}
                    >
                      <View className="flex-row items-center">
                        <Text className={`text-sm ${isSelected ? 'text-primary font-bold' : 'text-slate-400'}`}>{dept}</Text>
                        {isSelected && <Check size={14} color="#3b82f6" className="ml-2" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity onPress={() => setIsDeptModalVisible(false)} className="bg-primary p-5 rounded-3xl items-center shadow-lg shadow-primary/20">
              <Text className="text-white font-bold">Terminer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
