import { exportAllAppData, exportUserModifications, importAllAppData, readBackupFile } from '@/lib/backup-utils';
import { getAvailableBibles } from '@/lib/bible';
import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  BookOpen,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  Globe,
  Heart,
  Info,
  Languages,
  RefreshCcw,
  Save,
  Shield,
  Trash2,
  Type,
  User,
  X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Settings() {
  const router = useRouter();
  const { settings: globalSettings, updateSettings } = useSettings();
  const {
    t,
    syncRemoteManifest,
    getLanguageStatus,
    downloadLanguage,
    removeLanguage,
    getInstalledLanguages,
    getRemoteAvailableLanguages
  } = useTranslation();
  const [userName, setUserName] = useState('Fianatra Baiboly');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userDepartments, setUserDepartments] = useState<string[]>([]);
  const [isDeptModalVisible, setIsDeptModalVisible] = useState(false);
  const [isNameEditVisible, setIsNameEditVisible] = useState(false);
  const [tempName, setTempName] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [userEDS, setUserEDS] = useState('Lesona Lehibe (+ 35 taona)');
  const [isEDSModalVisible, setIsEDSModalVisible] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'general' | 'reading' | 'system' | 'support'>('general');
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);
  const [remoteLangs, setRemoteLangs] = useState<any[]>([]);
  const [isSyncingLangs, setIsSyncingLangs] = useState(false);

  // Import states
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importSummary, setImportSummary] = useState<any[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [installedBibles, setInstalledBibles] = useState<any[]>([]);
  const [isBibleModalVisible, setIsBibleModalVisible] = useState(false);

  const EDS_CLASSES = [
    "Lesona Zaza minono (0-12 volana)",
    "Lesona Zazakely (1-3 taona)",
    "Lesona Kilonga (4-6 taona)",
    "Lesona Ankizy (7-9 taona)",
    "Lesona Tanora zandriny (10-12 taona)",
    "Lesona Mantoanto (13-14 taona)",
    "Lesona Zatovo (15-18 taona)",
    "Lesona Tanora zokiny (19-35 taona)",
    "Lesona Lehibe (+ 35 taona)"
  ];

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    syncDepartments();
    loadBibles();
  }, []);

  const loadBibles = async () => {
    try {
      const list = await getAvailableBibles();
      setInstalledBibles(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Failed to load available bibles:", error);
      setInstalledBibles([]);
    }
  };

  const syncDepartments = async () => {
    try {
      const cachedManifest = await AsyncStorage.getItem('pdf_manifest_cache');
      if (cachedManifest) {
        const data = JSON.parse(cachedManifest);
        if (data.departments) setAvailableDepartments(data.departments);
      }

      const GITHUB_MANIFEST_URL = `https://raw.githubusercontent.com/Brayan-Clark/adventools/data/assets/docs/manifest.json?t=${Date.now()}`;
      const response = await fetch(GITHUB_MANIFEST_URL);
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData.departments) {
          setAvailableDepartments(remoteData.departments);
          await AsyncStorage.setItem('pdf_manifest_cache', JSON.stringify(remoteData));
        }
      }
    } catch (e) {
      console.log("Error syncing departments with remote manifest");
    }
  };

  const loadSettings = async () => {
    try {
      const name = await AsyncStorage.getItem('profile_name');
      const image = await AsyncStorage.getItem('profile_image');
      const depts = await AsyncStorage.getItem('profile_departments');
      const eds = await AsyncStorage.getItem('profile_eds_class');

      if (name !== null) setUserName(name);
      if (image !== null) setUserImage(image);
      if (depts !== null) {
        const parsed = JSON.parse(depts);
        if (Array.isArray(parsed)) setUserDepartments(parsed);
      }
      if (eds !== null) setUserEDS(eds);
    } catch (e) {
      console.error('Failed to load settings', e);
    }
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

  const saveEDS = async (eds: string) => {
    setUserEDS(eds);
    await AsyncStorage.setItem('profile_eds_class', eds);
    setIsEDSModalVisible(false);
  };

  const handleClearHistory = async () => {
    Alert.alert(
      t('reset_history'),
      t('clear_history_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('app_history');
            Alert.alert(t('success'), t('history_cleared'));
          }
        }
      ]
    );
  };

  const handleStartImport = async () => {
    const data = await readBackupFile();
    if (!data) return;

    const actualData = data.data || data;
    setImportData(actualData);

    const summaryMap: Record<string, { label: string, keys: string[] }> = {
      hymnes: { label: "Fanitsiana Cantiques", keys: [] },
      etude: { label: "Série d'Études Bibliques", keys: [] },
      themes: { label: "Thèmes Divers & Versets", keys: [] },
      notes: { label: "Mes Notes Personnelles", keys: [] },
      profile: { label: "Profil & Paramètres", keys: [] },
      others: { label: "Autres données", keys: [] }
    };

    Object.keys(actualData).forEach(key => {
      if (key.startsWith('hymne_edit_')) summaryMap.hymnes.keys.push(key);
      else if (key === 'utiles_etude_serie') summaryMap.etude.keys.push(key);
      else if (key === 'utiles_themes_divers') summaryMap.themes.keys.push(key);
      else if (key === 'adventools_notes') summaryMap.notes.keys.push(key);
      else if (key.startsWith('profile_') || key === 'app_settings') summaryMap.profile.keys.push(key);
      else summaryMap.others.keys.push(key);
    });

    const finalSummary = Object.entries(summaryMap)
      .filter(([_, val]) => val.keys.length > 0)
      .map(([id, val]) => ({ id, ...val }));

    setImportSummary(finalSummary);
    setSelectedKeys(finalSummary.map(s => s.id));
    setIsImportModalVisible(true);
  };

  const confirmImport = async () => {
    try {
      if (!importData) return;

      const keysToImport: string[] = [];
      importSummary.forEach(group => {
        if (selectedKeys.includes(group.id)) {
          keysToImport.push(...group.keys);
        }
      });

      if (keysToImport.length === 0) {
        Alert.alert(t('info'), t('no_category_selected'));
        return;
      }

      const pairs: [string, string][] = keysToImport.map(k => [k, String(importData[k])]);
      await AsyncStorage.multiSet(pairs);

      setIsImportModalVisible(false);
      Alert.alert(t('success'), t('import_success'));
      loadSettings();
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('import_error'));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-800/50">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center">
          <ChevronLeft size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>{t('settings')}</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

        {/* Modern Profile Header */}
        <View className="px-6 pt-8 pb-10 bg-slate-900/30">
          <View className="flex-row items-center">
            <View className="relative">
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8} className="w-20 h-20 rounded-3xl bg-slate-800 border-2 border-slate-700 items-center justify-center overflow-hidden">
                {userImage ? (
                  <Image source={{ uri: userImage }} className="w-full h-full" />
                ) : (
                  <User size={40} color="#475569" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={pickImage}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-primary items-center justify-center border-2 border-background-dark shadow-lg"
              >
                <Camera size={12} color="white" />
              </TouchableOpacity>
            </View>

            <View className="ml-5 flex-1">
              <TouchableOpacity
                onPress={() => {
                  setTempName(userName);
                  setIsNameEditVisible(true);
                }}
              >
                <Text className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Lexend_700Bold' }}>{userName}</Text>
                <View className="flex-row items-center flex-wrap gap-2">
                  <View className="bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{userEDS}</Text>
                  </View>

                  {userDepartments.length > 0 && (
                    <TouchableOpacity onPress={() => setIsDeptModalVisible(true)} className="bg-primary/20 px-3 py-1 rounded-full border border-primary/30">
                      <Text className="text-primary text-[10px] font-bold uppercase tracking-wider">
                        {userDepartments.length > 1
                          ? `${userDepartments[0]} +${userDepartments.length - 1}`
                          : userDepartments[0]}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {userDepartments.length === 0 && (
                    <TouchableOpacity onPress={() => setIsDeptModalVisible(true)}>
                      <Text className="text-slate-600 text-xs italic">{t('add_department' as any)}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tab Switcher */}
        <View className="px-6 mb-8 mt-4">
          <View className="flex-row bg-slate-900 p-1 rounded-2xl border border-slate-800/50">
            <TabButton
              active={activeTab === 'general'}
              label={t('tab_general')}
              icon={<User size={14} />}
              onPress={() => setActiveTab('general')}
            />
            <TabButton
              active={activeTab === 'reading'}
              label={t('tab_reading')}
              icon={<BookOpen size={14} />}
              onPress={() => setActiveTab('reading')}
            />
            <TabButton
              active={activeTab === 'system'}
              label={t('tab_system')}
              icon={<Save size={14} />}
              onPress={() => setActiveTab('system')}
            />
            <TabButton
              active={activeTab === 'support'}
              label={t('tab_support')}
              icon={<CircleHelp size={14} />}
              onPress={() => setActiveTab('support')}
            />
          </View>
        </View>

        <View className="px-6 pb-20">
          {activeTab === 'general' && (
            <>
              <SettingsGroup title={t('account_group')}>
                <SettingItem
                  icon={<User size={18} color="#64748b" />}
                  label={t('edit_name')}
                  value={userName}
                  onPress={() => {
                    setTempName(userName);
                    setIsNameEditVisible(true);
                  }}
                />
                <SettingItem
                  icon={<Globe size={18} color="#64748b" />}
                  label={t('language')}
                  value={globalSettings.language}
                  onPress={() => setIsLangModalVisible(true)}
                  isLast
                />
              </SettingsGroup>
            </>
          )}

          {activeTab === 'reading' && (
            <>
              <SettingsGroup title={t('content_group')}>
                <SettingItem
                  icon={<BookOpen size={18} color="#64748b" />}
                  label={t('default_bible')}
                  value={(installedBibles || []).find(b => b?.id === globalSettings?.bibleVersion)?.name || globalSettings?.bibleVersion || "MG65"}
                  onPress={async () => {
                    await loadBibles();
                    setIsBibleModalVisible(true);
                  }}
                />
                <SettingItem
                  icon={<Type size={18} color="#64748b" />}
                  label={t('reading_settings')}
                  onPress={() => router.push('/bible/settings' as any)}
                  isLast
                />
              </SettingsGroup>

              <SettingsGroup title={t('account_group')}>
                <SettingItem
                  icon={<BookOpen size={18} color="#64748b" />}
                  label={t('eds_class')}
                  value={userEDS}
                  onPress={() => setIsEDSModalVisible(true)}
                />
                <SettingItem
                  icon={<Shield size={18} color="#64748b" />}
                  label={t('my_departments')}
                  value={`${userDepartments.length} sélectionnés`}
                  onPress={() => setIsDeptModalVisible(true)}
                  isLast
                />
              </SettingsGroup>
            </>
          )}

          {activeTab === 'system' && (
            <>
              <SettingsGroup title={t('data_group')}>
                <SettingItem
                  icon={<Save size={18} color="#3b82f6" />}
                  label={t('full_backup')}
                  value="Notes, Bible, Profil..."
                  onPress={exportAllAppData}
                />
                <SettingItem
                  icon={<Download size={18} color="#3b82f6" />}
                  label={t('restore_backup')}
                  onPress={importAllAppData}
                  isLast
                />
              </SettingsGroup>

              <SettingsGroup title={t('maintenance')}>
                <SettingItem
                  icon={<Save size={18} color="#64748b" />}
                  label={t('export_mods')}
                  onPress={exportUserModifications}
                />
                <SettingItem
                  icon={<Download size={18} color="#64748b" />}
                  label={t('import_mods')}
                  onPress={handleStartImport}
                />
                <SettingItem
                  icon={<RefreshCcw size={18} color="#f87171" />}
                  label={t('reset_history')}
                  onPress={handleClearHistory}
                />
                <SettingItem
                  icon={<Languages size={18} color="#3b82f6" />}
                  label="Gestion des langues"
                  onPress={() => setIsLangModalVisible(true)}
                  isLast
                />
              </SettingsGroup>
            </>
          )}

          {activeTab === 'support' && (
            <>
              <SettingsGroup title={t('support_group')}>
                <SettingItem
                  icon={<Info size={18} color="#64748b" />}
                  label={t('about')}
                  onPress={() => router.push('/settings/about' as any)}
                />
                <SettingItem
                  icon={<Shield size={18} color="#64748b" />}
                  label={t('privacy')}
                  onPress={() => router.push('/settings/privacy' as any)}
                />
                <SettingItem
                  icon={<Heart size={18} color="#ef4444" />}
                  label={t('donation')}
                  onPress={() => router.push('/settings/don' as any)}
                />
                <SettingItem
                  icon={<CircleHelp size={18} color="#64748b" />}
                  label={t('help')}
                  value="Email"
                  onPress={() => Alert.alert(t('help'), t('contact_help_msg' as any))}
                  isLast
                />
              </SettingsGroup>
            </>
          )}
        </View>
      </ScrollView>

      {/* Modals are unchanged but kept for functionality */}
      <Modal visible={isNameEditVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center px-6">
          <View className="bg-slate-900 border border-slate-800 rounded-[32px] p-6">
            <Text className="text-white font-bold text-lg mb-4" style={{ fontFamily: 'Lexend_700Bold' }}>{t('modify_name')}</Text>
            <TextInput
              className="bg-slate-800 border border-slate-700 p-4 rounded-2xl text-white mb-6"
              value={tempName}
              onChangeText={setTempName}
              placeholder={t('your_name')}
              placeholderTextColor="#64748b"
              autoFocus
            />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setIsNameEditVisible(false)} className="flex-1 p-4 rounded-2xl border border-slate-700 items-center">
                <Text className="text-slate-400 font-medium">{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName} className="flex-1 p-4 rounded-2xl bg-primary items-center">
                <Text className="text-white font-bold">{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDS Selection Modal */}
      <Modal visible={isEDSModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] px-6 pt-8 pb-10 max-h-[80%] border-t border-slate-800">
            <View className="flex-row justify-between items-center mb-6 px-2">
              <View>
                <Text className="text-white text-2xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>{t('eds_class')}</Text>
                <Text className="text-slate-500 mt-1">{t('select_class_ss')}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEDSModalVisible(false)} className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center">
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-2 mb-10">
                {EDS_CLASSES.map((eds) => {
                  const isSelected = userEDS === eds;
                  return (
                    <TouchableOpacity
                      key={eds}
                      onPress={() => saveEDS(eds)}
                      className={`px-5 py-4 rounded-2xl border ${isSelected ? 'bg-primary/10 border-primary' : 'bg-slate-800/50 border-slate-800'}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className={`text-sm ${isSelected ? 'text-primary font-bold' : 'text-slate-300'}`}>{eds}</Text>
                        {isSelected && <Check size={18} color="#3b82f6" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bible Selection Modal */}
      <Modal visible={isBibleModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] px-6 pt-8 pb-10 max-h-[80%] border-t border-slate-800">
            <View className="flex-row justify-between items-center mb-6 px-2">
              <View>
                <Text className="text-white text-2xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>{t('default_bible')}</Text>
                <Text className="text-slate-500 mt-1">{t('choose_bible_version' as any)}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsBibleModalVisible(false)} className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center">
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-2 mb-10">
                {installedBibles.map((bible) => {
                  const isSelected = globalSettings.bibleVersion === bible.id;
                  return (
                    <TouchableOpacity
                      key={bible.id}
                      onPress={() => {
                        updateSettings({ bibleVersion: bible.id });
                        setIsBibleModalVisible(false);
                      }}
                      className={`px-5 py-4 rounded-2xl border ${isSelected ? 'bg-primary/10 border-primary' : 'bg-slate-800/50 border-slate-800'}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className={`text-base font-bold ${isSelected ? 'text-primary' : 'text-white'}`}>{bible.name || bible.id}</Text>
                          <Text className="text-slate-500 text-xs mt-1">{bible.language || t('unknown' as any)}</Text>
                        </View>
                        {isSelected && <Check size={20} color="#3b82f6" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Department Modal */}
      <Modal visible={isDeptModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] px-6 pt-8 pb-10 max-h-[80%] border-t border-slate-800">
            <View className="flex-row justify-between items-center mb-6 px-2">
              <View>
                <Text className="text-white text-2xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>{t('my_departments')}</Text>
                <Text className="text-slate-500 mt-1">{t('select_church_depts')}</Text>
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

            <TouchableOpacity onPress={() => setIsDeptModalVisible(false)} className="bg-primary p-5 rounded-3xl items-center">
              <Text className="text-white font-bold">{t('finish')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal visible={isImportModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] px-6 pt-8 pb-10 max-h-[85%] border-t border-slate-800">
            <View className="flex-row justify-between items-center mb-6 px-2">
              <View>
                <Text className="text-white text-2xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>{t('import_mods')}</Text>
                <Text className="text-slate-500 mt-1">{t('import_file_selection')}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsImportModalVisible(false)} className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center">
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              <View className="gap-3">
                {importSummary.map((group) => {
                  const isSelected = selectedKeys.includes(group.id);
                  return (
                    <TouchableOpacity
                      key={group.id}
                      onPress={() => {
                        if (isSelected) setSelectedKeys(selectedKeys.filter(k => k !== group.id));
                        else setSelectedKeys([...selectedKeys, group.id]);
                      }}
                      className={`p-5 rounded-3xl border ${isSelected ? 'bg-primary/10 border-primary' : 'bg-slate-800/50 border-slate-800'}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className={`text-base font-bold ${isSelected ? 'text-primary' : 'text-slate-300'}`}>{group.label}</Text>
                          <Text className="text-xs text-slate-500 mt-1">{group.keys.length} {t('items_to_import')}</Text>
                        </View>
                        <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-slate-700'}`}>
                          {isSelected && <Check size={14} color="white" />}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={confirmImport}
              className="bg-primary p-5 rounded-[24px] items-center flex-row justify-center"
            >
              <Check size={20} color="white" className="mr-2" />
              <Text className="text-white font-bold text-lg">{t('apply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Manager Modal */}
      <Modal visible={isLangModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] px-6 pt-8 pb-10 max-h-[90%] border-t border-slate-800">
            <View className="flex-row justify-between items-center mb-6 px-2">
              <View>
                <Text className="text-white text-2xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>{t('language')}</Text>
                <Text className="text-slate-500 mt-1">{t('manage_languages' as any)}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={async () => {
                    setIsSyncingLangs(true);
                    const manifest = await syncRemoteManifest();
                    if (manifest) {
                      setRemoteLangs(manifest.languages);
                    }
                    setIsSyncingLangs(false);
                  }}
                  className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center"
                  disabled={isSyncingLangs}
                >
                  {isSyncingLangs ? <ActivityIndicator size="small" color="#3b82f6" /> : <RefreshCcw size={18} color="#94a3b8" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsLangModalVisible(false)} className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center">
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-3 mb-10">
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest ml-2 mb-1">{t('installed_languages' as any)}</Text>
                {getInstalledLanguages().map((lang) => {
                  const isSelected = globalSettings.language === lang.id;
                  const status = getLanguageStatus(lang.id);

                  return (
                    <View key={lang.id} className="bg-slate-800/50 rounded-3xl border border-slate-800 p-4">
                      <View className="flex-row items-center justify-between">
                        <TouchableOpacity
                          onPress={() => updateSettings({ language: lang.id as any })}
                          className="flex-1 flex-row items-center"
                        >
                          <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-4 ${isSelected ? 'bg-primary' : 'bg-slate-800'}`}>
                            <Globe size={18} color={isSelected ? 'white' : '#64748b'} />
                          </View>
                          <View>
                            <Text className={`text-white font-bold ${isSelected ? 'text-primary' : ''}`}>{lang.name}</Text>
                            <Text className="text-slate-500 text-[10px] uppercase">
                              {lang.isBuiltIn ? t('built_in' as any) : t('downloaded' as any)}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <View className="flex-row items-center gap-2">
                          {status === 'update-available' && (
                            <TouchableOpacity
                              onPress={() => downloadLanguage(lang.id)}
                              className="bg-primary/20 p-2 rounded-xl"
                            >
                              <RefreshCcw size={16} color="#3b82f6" />
                            </TouchableOpacity>
                          )}
                          {!lang.isBuiltIn && (
                            <TouchableOpacity
                              onPress={() => removeLanguage(lang.id)}
                              className="bg-red-500/10 p-2 rounded-xl"
                            >
                              <Trash2 size={16} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                          {isSelected && <Check size={20} color="#3b82f6" />}
                        </View>
                      </View>
                    </View>
                  );
                })}

                {getRemoteAvailableLanguages().filter(rl => !getInstalledLanguages().find(il => il.id === rl.id)).length > 0 && (
                  <>
                    <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest ml-2 mt-4 mb-1">{t('available_cloud' as any)}</Text>
                    {getRemoteAvailableLanguages()
                      .filter(rl => !getInstalledLanguages().find(il => il.id === rl.id))
                      .map((rl) => (
                        <View key={rl.id} className="bg-slate-900 border border-slate-800 p-4 rounded-3xl">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                              <View className="w-10 h-10 rounded-2xl bg-slate-800 items-center justify-center mr-4">
                                <Globe size={18} color="#475569" />
                              </View>
                              <View>
                                <Text className="text-white font-bold">{rl.name}</Text>
                                <Text className="text-slate-500 text-[10px]">Version {rl.version}</Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              onPress={() => downloadLanguage(rl.id)}
                              className="bg-primary px-4 py-2 rounded-xl"
                            >
                              <Text className="text-white text-xs font-bold">{t('download' as any)}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    }
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function TabButton({ active, label, icon, onPress }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${active ? 'bg-primary' : ''}`}
    >
      <View className={`${active ? 'text-white' : 'text-slate-500'} mr-1.5`}>
        {React.cloneElement(icon, { color: active ? 'white' : '#64748b' })}
      </View>
      {active && <Text className="text-white text-[10px] font-bold uppercase tracking-widest">{label}</Text>}
    </TouchableOpacity>
  );
}

function SettingsGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-[10px] font-bold uppercase text-slate-500 mb-3 ml-2 tracking-widest">{title}</Text>
      <View className="bg-slate-900 border border-slate-800/50 rounded-3xl overflow-hidden shadow-sm">
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
      className={`flex-row items-center p-4 pl-5 ${!isLast ? 'border-b border-slate-800/20' : ''} bg-slate-900 active:bg-slate-800`}
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

