import { exportAllAppData, importAllAppData, readBackupFile } from '@/lib/backup-utils';
import { performUpdateCheck } from '@/lib/updater';
import { getAvailableBibles } from '@/lib/bible';
import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import { useToast } from '@/lib/toast-context';
import { clearHistory } from '@/lib/user-storage';
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
  X,
  Bell,
  Clock
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, KeyboardAvoidingView, ScrollView, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/ui/AppText';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleStudyReminder } from '@/lib/notifications';



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
  const { showToast } = useToast();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userDepartments, setUserDepartments] = useState<string[]>([]);
  const [isDeptModalVisible, setIsDeptModalVisible] = useState(false);
  const [isNameEditVisible, setIsNameEditVisible] = useState(false);
  const [isCityEditVisible, setIsCityEditVisible] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempCity, setTempCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [isCitySearching, setIsCitySearching] = useState(false);
  const DEFAULT_DEPARTMENTS = [
    { id: "pasteur", translations: { fr: "Pasteur", mg: "Mpitandrina", en: "Pastor" } },
    { id: "ancien", translations: { fr: "Ancien", mg: "Loholona", en: "Elder" } },
    { id: "diacre", translations: { fr: "Diacre", mg: "Diakona", en: "Deacon" } },
    { id: "diaconesse", translations: { fr: "Diaconesse", mg: "Diakonisa", en: "Deaconess" } },
    { id: "ecole_sabbat", translations: { fr: "École du Sabbat", mg: "Sekoly Sabata", en: "Sabbath School" } },
    { id: "jeunesse", translations: { fr: "Jeunesse (AJA)", mg: "Tanora (AJA)", en: "Youth" } },
    { id: "mifem", translations: { fr: "Ministères de la Femme", mg: "Minisiteran'ny Vehivavy", en: "Women's Ministries" } },
    { id: "mienf", translations: { fr: "Ministères de l'Enfant", mg: "Minisiteran'ny Ankizy", en: "Children's Ministries" } },
    { id: "publication", translations: { fr: "Publication", mg: "Fampielezam-boky", en: "Publishing" } },
    { id: "communication", translations: { fr: "Communication", mg: "Serasera", en: "Communication" } },
    { id: "sante", translations: { fr: "Santé", mg: "Fahasalamana", en: "Health" } },
    { id: "tresorerie", translations: { fr: "Trésorerie", mg: "Firim-bolam-piangonana", en: "Treasury" } },
    { id: "secretariat", translations: { fr: "Secrétariat", mg: "Sekretariat", en: "Secretariat" } },
    { id: "musique", translations: { fr: "Musique", mg: "Mozika", en: "Music" } },
    { id: "mip", translations: { fr: "Ministères Personnels", mg: "Asa Fitoriana", en: "Personal Ministries" } },
    { id: "education", translations: { fr: "Éducation", mg: "Fanabeazana", en: "Education" } },
    { id: "membre", translations: { fr: "Membre", mg: "Mpikambana", en: "Member" } }
  ];
  const [availableDepartments, setAvailableDepartments] = useState<any[]>(DEFAULT_DEPARTMENTS);
  const [userEDS, setUserEDS] = useState('Lesona Lehibe (+ 35 taona)');
  const [isEDSModalVisible, setIsEDSModalVisible] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'general' | 'reading' | 'system' | 'support'>('general');
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);
  const [remoteLangs, setRemoteLangs] = useState<any[]>([]);
  const [isSyncingLangs, setIsSyncingLangs] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Import states
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importSummary, setImportSummary] = useState<any[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  
  // Export states
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [selectedExportKeys, setSelectedExportKeys] = useState<string[]>(['hymnes', 'bible', 'notes', 'profile', 'others']);
  
  const exportGroups = [
    { id: 'hymnes', label: "Cantiques (Favoris & Éditions)" },
    { id: 'bible', label: "Bible (Signets, Favoris & Surlignage)" },
    { id: 'notes', label: "Notes & Études Bibliques" },
    { id: 'profile', label: "Profil & Paramètres" },
    { id: 'others', label: "Autres données" }
  ];

  const confirmExport = async () => {
    if (selectedExportKeys.length === 0) {
      Alert.alert(t('info'), t('no_category_selected'));
      return;
    }
    setIsExportModalVisible(false);
    await exportAllAppData(selectedExportKeys);
  };

  const [installedBibles, setInstalledBibles] = useState<any[]>([]);
  const [isBibleModalVisible, setIsBibleModalVisible] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLeadTimeModalVisible, setIsLeadTimeModalVisible] = useState(false);
  const [isReminderSetupVisible, setIsReminderSetupVisible] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [setupTime, setSetupTime] = useState('07:00');
  const [setupLead, setSetupLead] = useState(0);
  const [isCustomLeadVisible, setIsCustomLeadVisible] = useState(false);
  const [customLeadInput, setCustomLeadInput] = useState('');

  const onTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      if (isReminderSetupVisible) {
        // Inside setup wizard: just update the local step state
        setSetupTime(timeStr);
      } else {
        // Direct edit from the settings list: save & reschedule immediately
        try {
          await updateSettings({ studyReminderTime: timeStr });
          await scheduleStudyReminder(
            globalSettings.studyReminderEnabled,
            timeStr,
            globalSettings.studyReminderLeadMinutes,
            globalSettings.language,
            true
          );
          const lead = globalSettings.studyReminderLeadMinutes;
          const summary = lead === 0
            ? `${timeStr} (${t('exact_time' as any)})`
            : `${timeStr} • ${lead} ${t('minutes_before' as any)}`;
          showToast(`${t('reminder_saved' as any)}\n${summary}`, 'success');
        } catch (err) {
          console.error('Failed to update reminder time:', err);
          showToast(t('error'), 'error');
        }
      }
    }
  };

  const getPickerDate = () => {
    const d = new Date();
    const timeToParse = isReminderSetupVisible ? setupTime : globalSettings.studyReminderTime;
    if (timeToParse) {
      const [h, m] = timeToParse.split(':');
      d.setHours(parseInt(h, 10) || 7);
      d.setMinutes(parseInt(m, 10) || 0);
    } else {
      d.setHours(7);
      d.setMinutes(0);
    }
    return d;
  };

  // Security
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [existingPin, setExistingPin] = useState<string | null>(null);
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');

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

  // Debounced City Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tempCity && tempCity.length > 2 && isCityEditVisible) {
        searchCities(tempCity);
      } else {
        setCitySuggestions([]);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [tempCity, isCityEditVisible]);

  const searchCities = async (query: string) => {
    setIsCitySearching(true);
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=fr`;
      const resp = await fetch(geoUrl);
      if (resp.ok) {
        const data = await resp.json();
        setCitySuggestions(data.results || []);
      }
    } catch (e) {
    } finally {
      setIsCitySearching(false);
    }
  };

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
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const cachedManifest = await AsyncStorage.getItem('pdf_manifest_cache');
      const lastFetchStr = await AsyncStorage.getItem('manifest_last_fetch');
      const now = Date.now();

      if (cachedManifest) {
        const data = JSON.parse(cachedManifest);
        if (data.departments) setAvailableDepartments(data.departments);
      }

      const lastFetch = lastFetchStr ? parseInt(lastFetchStr, 10) : 0;

      // Only fetch if older than 30 days
      if (now - lastFetch > THIRTY_DAYS_MS) {
        const GITHUB_MANIFEST_URL = `https://raw.githubusercontent.com/Brayan-Clark/adventools/data/docs/manifest.json?t=${Date.now()}`;
        const response = await fetch(GITHUB_MANIFEST_URL);
        if (response.ok) {
          const remoteData = await response.json();
          if (remoteData.departments) {
            setAvailableDepartments(remoteData.departments);
            await AsyncStorage.setItem('pdf_manifest_cache', JSON.stringify(remoteData));
            await AsyncStorage.setItem('manifest_last_fetch', now.toString());
          }
        }
      }
    } catch (e) {
      console.log("Error syncing departments with remote manifest");
    }
  };

  const loadSettings = async () => {
    try {
      const image = await AsyncStorage.getItem('profile_image');
      const depts = await AsyncStorage.getItem('profile_departments');
      const eds = await AsyncStorage.getItem('profile_eds_class');

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
      await updateSettings({ userName: tempName.trim() });
      setIsNameEditVisible(false);
    }
  };

  const saveCity = async () => {
    await updateSettings({ locationCity: tempCity.trim() });
    setIsCityEditVisible(false);
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
            await clearHistory();
            Alert.alert(t('success'), t('history_cleared'));
          }
        }
      ]
    );
  };

  const handleChangePin = async () => {
    if (existingPin && oldPinInput !== existingPin) {
      Alert.alert("Erreur", "L'ancien code PIN est incorrect.");
      return;
    }
    if (newPinInput.length >= 4) {
      await AsyncStorage.setItem('adventools_note_lock_pin', newPinInput);
      setNewPinInput('');
      setOldPinInput('');
      setIsPinModalVisible(false);
      Alert.alert(t('success'), "Le code PIN de vos notes a été modifié avec succès.");
    } else {
      Alert.alert("Erreur", "Le code PIN doit contenir au moins 4 caractères.");
    }
  };

  const handleStartImport = async () => {
    const data = await readBackupFile();
    if (!data) return;

    const actualData = data.data || data;
    setImportData(actualData);

    const summaryMap: Record<string, { label: string, keys: string[] }> = {
      hymnes: { label: "Cantiques (Favoris & Éditions)", keys: [] },
      bible: { label: "Bible (Signets, Favoris & Surlignage)", keys: [] },
      notes: { label: "Notes & Études Bibliques", keys: [] },
      profile: { label: "Profil & Paramètres", keys: [] },
      others: { label: "Autres données", keys: [] }
    };

    if (actualData.bible_markup) summaryMap.bible.keys.push('bible_markup');
    if (actualData.notes) summaryMap.notes.keys.push('notes');
    if (actualData.folders) summaryMap.notes.keys.push('folders');
    if (actualData.settings) summaryMap.profile.keys.push('settings');
    if (actualData.history) summaryMap.others.keys.push('history');
    if (actualData.favorites) summaryMap.others.keys.push('favorites');
    if (actualData.downloads) summaryMap.others.keys.push('downloads');
    if (actualData.asyncStorage) summaryMap.others.keys.push('asyncStorage');

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

      // Reconstruct data object for importData
      const filteredData: any = {};
      keysToImport.forEach(k => {
        filteredData[k] = importData[k];
      });

      // We need to import via lib/user-storage.ts importData function which knows how to insert into SQLite.
      // importData expects the backup shape { data: {...} }, so wrap the filtered selection.
      const { importData: dbImport } = require('@/lib/user-storage');
      await dbImport({ data: filteredData });

      setIsImportModalVisible(false);
      Alert.alert(t('success'), "Restauration terminée avec succès !");
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
                  setTempName(globalSettings.userName || 'Fianatra Baiboly');
                  setIsNameEditVisible(true);
                }}
              >
                <Text className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Lexend_700Bold' }}>{globalSettings.userName || 'Fianatra Baiboly'}</Text>
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
                  value={globalSettings.userName || 'Fianatra Baiboly'}
                  onPress={() => {
                    setTempName(globalSettings.userName || 'Fianatra Baiboly');
                    setIsNameEditVisible(true);
                  }}
                />
                <SettingItem
                  icon={<Globe size={18} color="#64748b" />}
                  label={t('location_city')}
                  value={globalSettings.locationCity || t('auto_ip')}
                  onPress={() => {
                    setTempCity(globalSettings.locationCity);
                    setIsCityEditVisible(true);
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

              <SettingsGroup title={t('study_reminder_group' as any)}>
                <SettingItem
                  icon={<Bell size={18} color="#f59e0b" />}
                  label={t('enable_reminder' as any)}
                  rightElement={
                    <Switch
                      value={globalSettings.studyReminderEnabled}
                      onValueChange={async (val) => {
                        if (val) {
                          setSetupTime(globalSettings.studyReminderTime || '07:00');
                          setSetupLead(globalSettings.studyReminderLeadMinutes || 0);
                          setSetupStep(1);
                          setIsReminderSetupVisible(true);
                        } else {
                          await updateSettings({ studyReminderEnabled: false });
                          await scheduleStudyReminder(false, globalSettings.studyReminderTime, globalSettings.studyReminderLeadMinutes, globalSettings.language, true);
                        }
                      }}
                      trackColor={{ false: '#334155', true: '#3b82f6' }}
                      thumbColor="#fff"
                    />
                  }
                />
                
                {globalSettings.studyReminderEnabled && (
                  <>
                    <SettingItem
                      icon={<Clock size={18} color="#3b82f6" />}
                      label={t('reminder_time' as any)}
                      value={globalSettings.studyReminderTime}
                      onPress={() => {
                        setShowTimePicker(true);
                      }}
                    />
                    <SettingItem
                      icon={<Clock size={18} color="#10b981" />}
                      label={t('warn_in_advance' as any)}
                      value={
                        globalSettings.studyReminderLeadMinutes === 0 
                          ? t('exact_time' as any) 
                          : `${globalSettings.studyReminderLeadMinutes} ${t('minutes_before' as any)}`
                      }
                      onPress={() => {
                        setIsCustomLeadVisible(false);
                        setCustomLeadInput('');
                        setIsLeadTimeModalVisible(true);
                      }}
                      isLast
                    />
                  </>
                )}
              </SettingsGroup>

              {showTimePicker && (
                <DateTimePicker
                  value={getPickerDate()}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                />
              )}
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
                  value={
                    userDepartments.map(id => {
                      const d = availableDepartments.find(ad => ad.id === id);
                      if (!d) return id;
                      const langKey = globalSettings.language === 'Malagasy' ? 'mg' : (globalSettings.language === 'English' ? 'en' : 'fr');
                      return d.translations[langKey] || d.translations.fr || d.id;
                    }).join(', ')
                  }
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
                  label="Sauvegarder les données"
                  value="Notes, Bible, Profil, Cantiques..."
                  onPress={() => setIsExportModalVisible(true)}
                />
                <SettingItem
                  icon={<Download size={18} color="#3b82f6" />}
                  label="Restauration Sécurisée"
                  value="Restaurer un fichier .advb"
                  onPress={handleStartImport}
                  isLast
                />
              </SettingsGroup>

              <SettingsGroup title="Sécurité">
                <SettingItem
                  icon={<Shield size={18} color="#f59e0b" />}
                  label="Modifier le code PIN des notes"
                  value="Pour les notes verrouillées"
                  onPress={async () => {
                    const pin = await AsyncStorage.getItem('adventools_note_lock_pin');
                    setExistingPin(pin);
                    setOldPinInput('');
                    setNewPinInput('');
                    setIsPinModalVisible(true);
                  }}
                  isLast
                />
              </SettingsGroup>

              <SettingsGroup title={t('maintenance')}>
                <SettingItem
                  icon={<RefreshCcw size={18} color="#3b82f6" />}
                  label={t('check_updates')}
                  value={isUpdating ? t('checking') : t('check_manually')}
                  onPress={async () => {
                    if (isUpdating) return;
                    setIsUpdating(true);
                    try {
                        await performUpdateCheck(globalSettings.downloadOverWifiOnly, true);
                    } catch (e) {}
                    setIsUpdating(false);
                  }}
                  rightElement={isUpdating ? <ActivityIndicator size="small" color="#3b82f6" /> : undefined}
                />
                <SettingItem
                  icon={<Globe size={18} color="#10b981" />}
                  label="Mises à jour via Wi-Fi uniquement"
                  rightElement={
                    <Switch
                      value={globalSettings.downloadOverWifiOnly}
                      onValueChange={(val) => updateSettings({ downloadOverWifiOnly: val })}
                      trackColor={{ false: '#334155', true: '#3b82f6' }}
                      thumbColor="#fff"
                    />
                  }
                />
                <SettingItem
                  icon={<RefreshCcw size={18} color="#8b5cf6" />}
                  label="Vérification des mises à jour"
                  value={`Tous les ${globalSettings.updateCheckIntervalMonths} mois`}
                  onPress={() => {
                    Alert.alert(
                      "Fréquence de vérification",
                      "Choisissez l'intervalle de vérification des mises à jour :",
                      [
                        { text: "1 mois", onPress: () => updateSettings({ updateCheckIntervalMonths: 1 }) },
                        { text: "2 mois", onPress: () => updateSettings({ updateCheckIntervalMonths: 2 }) },
                        { text: "3 mois", onPress: () => updateSettings({ updateCheckIntervalMonths: 3 }) },
                        { text: "6 mois", onPress: () => updateSettings({ updateCheckIntervalMonths: 6 }) },
                        { text: t('cancel'), style: 'cancel' }
                      ]
                    );
                  }}
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
                />
                <SettingItem
                  icon={<User size={18} color="#8b5cf6" />}
                  label="Revoir l'introduction"
                  value="Onboarding"
                  onPress={() => {
                    Alert.alert(
                      "Revoir l'introduction",
                      "Cela va relancer l'écran de bienvenue au prochain démarrage.",
                      [
                        { text: t('cancel'), style: 'cancel' },
                        {
                          text: "Relancer maintenant",
                          onPress: async () => {
                            await AsyncStorage.removeItem('adventools_onboarding_done');
                            router.replace('/onboarding' as any);
                          }
                        }
                      ]
                    );
                  }}
                  isLast
                />
              </SettingsGroup>
            </>
          )}
        </View>
      </ScrollView>

      {/* Modals are unchanged but kept for functionality */}
      <Modal visible={isNameEditVisible} transparent animationType="fade" statusBarTranslucent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40} className="flex-1">
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
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={isCityEditVisible} transparent animationType="fade" statusBarTranslucent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40} className="flex-1">
          <View className="flex-1 bg-black/60 justify-center px-6">
            <View className="bg-slate-900 border border-slate-800 rounded-[32px] p-6">
              <Text className="text-white font-bold text-lg mb-2" style={{ fontFamily: 'Lexend_700Bold' }}>{t('location_city')}</Text>
              <Text className="text-slate-500 text-xs mb-4">{t('location_city_desc')}</Text>
              <TextInput
                className="bg-slate-800 border border-slate-700 p-4 rounded-2xl text-white mb-2"
                value={tempCity}
                onChangeText={setTempCity}
                placeholder={t('city_placeholder')}
                placeholderTextColor="#64748b"
              />
              
              {/* SUGGESTIONS LIST */}
              <View className="mb-6 max-h-48 rounded-xl overflow-hidden bg-slate-800/20">
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {isCitySearching && <ActivityIndicator size="small" color="#3b82f6" className="py-2" />}
                  {citySuggestions.map((item, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      onPress={() => {
                         setTempCity(`${item.name}, ${item.country}`);
                         setCitySuggestions([]);
                      }}
                      className="p-3 border-b border-slate-800/50 flex-row items-center justify-between"
                    >
                      <View className="flex-1 pr-2">
                        <Text className="text-white font-bold text-sm tracking-tight">{item.name}</Text>
                        <Text className="text-slate-500 text-[10px] mt-0.5">{item.admin1 || ''}{item.admin1 ? ', ' : ''}{item.country}</Text>
                      </View>
                      <Check size={14} color="#3b82f6" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setIsCityEditVisible(false)} className="flex-1 p-4 rounded-2xl border border-slate-700 items-center">
                  <Text className="text-slate-400 font-medium">{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveCity} className="flex-1 p-4 rounded-2xl bg-primary items-center">
                  <Text className="text-white font-bold">{t('save')}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => { setTempCity(''); updateSettings({ locationCity: '' }); setIsCityEditVisible(false); }} className="mt-4 p-2 items-center">
                <Text className="text-red-400 text-xs font-bold">{t('reset_auto')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EDS Selection Modal */}
      <Modal visible={isEDSModalVisible} transparent animationType="slide" statusBarTranslucent={true}>
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
                  const isSelected = userDepartments.includes(dept.id);
                  const langKey = globalSettings.language === 'Malagasy' ? 'mg' : (globalSettings.language === 'English' ? 'en' : 'fr');
                  const label = dept.translations?.[langKey] || dept.translations?.fr || dept.id;

                  return (
                    <TouchableOpacity
                      key={dept.id}
                      onPress={() => toggleDepartment(dept.id)}
                      className={`px-4 py-3 rounded-2xl border ${isSelected ? 'bg-primary/10 border-primary' : 'bg-slate-800/50 border-slate-800'}`}
                    >
                      <View className="flex-row items-center">
                        <Text className={`text-sm ${isSelected ? 'text-primary font-bold' : 'text-slate-400'}`}>{label}</Text>
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

      {/* Export Modal */}
      <Modal visible={isExportModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] px-6 pt-8 pb-10 max-h-[85%] border-t border-slate-800">
            <View className="flex-row justify-between items-center mb-6 px-2">
              <View>
                <Text className="text-white text-2xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>Sauvegarder</Text>
                <Text className="text-slate-500 mt-1">Choisissez les données à exporter</Text>
              </View>
              <TouchableOpacity onPress={() => setIsExportModalVisible(false)} className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center">
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              <View className="gap-3">
                {exportGroups.map((group) => {
                  const isSelected = selectedExportKeys.includes(group.id);
                  return (
                    <TouchableOpacity
                      key={group.id}
                      onPress={() => {
                        if (isSelected) setSelectedExportKeys(selectedExportKeys.filter(k => k !== group.id));
                        else setSelectedExportKeys([...selectedExportKeys, group.id]);
                      }}
                      className={`p-5 rounded-3xl border ${isSelected ? 'bg-primary/10 border-primary' : 'bg-slate-800/50 border-slate-800'}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className={`text-base font-bold ${isSelected ? 'text-primary' : 'text-slate-300'}`}>{group.label}</Text>
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
              onPress={confirmExport}
              className="bg-primary p-5 rounded-[24px] items-center flex-row justify-center"
            >
              <Save size={20} color="white" className="mr-2" />
              <Text className="text-white font-bold text-lg">Exporter la sauvegarde</Text>
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
                          onPress={async () => {
                            await updateSettings({ language: lang.id as any });
                            // Reschedule notifications in the new language immediately
                            if (globalSettings.studyReminderEnabled) {
                              await scheduleStudyReminder(
                                true,
                                globalSettings.studyReminderTime,
                                globalSettings.studyReminderLeadMinutes,
                                lang.id,
                                true
                              );
                            }
                          }}
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

      {/* PIN Modification Modal */}
      <Modal visible={isPinModalVisible} transparent animationType="fade" statusBarTranslucent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40} className="flex-1">
          <View className="flex-1 bg-black/60 justify-center px-6">
            <View className="bg-slate-900 border border-slate-800 rounded-[32px] p-6">
              <Text className="text-white font-bold text-lg mb-2" style={{ fontFamily: 'Lexend_700Bold' }}>Code PIN des notes</Text>
              <Text className="text-slate-500 text-xs mb-4">Ce code unique protège toutes vos notes verrouillées.</Text>
              {existingPin ? (
                <View className="mb-4">
                  <Text className="text-slate-400 text-xs mb-2">Ancien code PIN :</Text>
                  <TextInput
                    className="bg-slate-800 border border-slate-700 p-4 rounded-2xl text-white font-bold tracking-widest text-center text-xl"
                    value={oldPinInput}
                    onChangeText={setOldPinInput}
                    placeholder="Ancien PIN"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={8}
                    autoFocus
                  />
                </View>
              ) : null}
              <View className="mb-6">
                <Text className="text-slate-400 text-xs mb-2">Nouveau code PIN :</Text>
                <TextInput
                  className="bg-slate-800 border border-slate-700 p-4 rounded-2xl text-white font-bold tracking-widest text-center text-xl"
                  value={newPinInput}
                  onChangeText={setNewPinInput}
                  placeholder="Nouveau PIN"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={8}
                  autoFocus={!existingPin}
                />
              </View>
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setIsPinModalVisible(false)} className="flex-1 p-4 rounded-2xl border border-slate-700 items-center">
                  <Text className="text-slate-400 font-medium">{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleChangePin} className="flex-1 p-4 rounded-2xl bg-amber-500 items-center">
                  <Text className="text-white font-bold">{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lead Time Modal */}
      <Modal visible={isLeadTimeModalVisible} transparent animationType="slide" statusBarTranslucent={true}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[32px] p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white font-bold text-lg" style={{ fontFamily: 'Lexend_700Bold' }}>{t('warn_in_advance' as any)}</Text>
              <TouchableOpacity onPress={() => setIsLeadTimeModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center">
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text className="text-slate-400 text-sm mb-4">{t('when_warn_advance' as any)}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-2">
                {[
                  { value: 0, label: t('no_warning' as any) },
                  { value: 5, label: `5 ${t('minutes_before' as any)}` },
                  { value: 10, label: `10 ${t('minutes_before' as any)}` },
                  { value: 15, label: `15 ${t('minutes_before' as any)}` },
                  { value: 30, label: `30 ${t('minutes_before' as any)}` },
                  { value: -1, label: t('custom_lead_time' as any) }
                ].map((option) => {
                  const isSelected = option.value === -1 ? isCustomLeadVisible : (!isCustomLeadVisible && globalSettings.studyReminderLeadMinutes === option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={async () => {
                        if (option.value === -1) {
                           setIsCustomLeadVisible(true);
                        } else {
                           setIsCustomLeadVisible(false);
                           try {
                             await updateSettings({ studyReminderLeadMinutes: option.value });
                             await scheduleStudyReminder(true, globalSettings.studyReminderTime, option.value, globalSettings.language, true);
                             const summary = option.value === 0
                               ? `${globalSettings.studyReminderTime} (${t('exact_time' as any)})`
                               : `${globalSettings.studyReminderTime} • ${option.value} ${t('minutes_before' as any)}`;
                             showToast(`${t('reminder_saved' as any)}\n${summary}`, 'success');
                           } catch (err) {
                             console.error('Failed to update lead time:', err);
                             showToast(t('error'), 'error');
                           }
                           setIsLeadTimeModalVisible(false);
                        }
                      }}
                      className={`flex-row items-center justify-between p-4 rounded-2xl border ${isSelected ? 'bg-primary/20 border-primary' : 'bg-slate-800 border-slate-700'}`}
                    >
                      <Text className={`font-bold ${isSelected ? 'text-primary' : 'text-slate-300'}`}>{option.label}</Text>
                      {isSelected && <Check size={18} color="#3b82f6" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {isCustomLeadVisible && (
                 <View className="mt-4 flex-row items-center">
                    <TextInput
                      className="flex-1 bg-slate-800 border border-slate-700 p-4 rounded-2xl text-white font-bold"
                      value={customLeadInput}
                      onChangeText={setCustomLeadInput}
                      placeholder="Ex: 45"
                      placeholderTextColor="#64748b"
                      keyboardType="numeric"
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={async () => {
                        const val = parseInt(customLeadInput, 10);
                        if (!isNaN(val) && val >= 0) {
                            try {
                              await updateSettings({ studyReminderLeadMinutes: val });
                              await scheduleStudyReminder(true, globalSettings.studyReminderTime, val, globalSettings.language, true);
                              const summary = val === 0
                                ? `${globalSettings.studyReminderTime} (${t('exact_time' as any)})`
                                : `${globalSettings.studyReminderTime} • ${val} ${t('minutes_before' as any)}`;
                              showToast(`${t('reminder_saved' as any)}\n${summary}`, 'success');
                            } catch (err) {
                              console.error('Failed to save custom lead time:', err);
                              showToast(t('error'), 'error');
                            }
                            setIsCustomLeadVisible(false);
                            setIsLeadTimeModalVisible(false);
                        }
                     }}
                      className="ml-3 bg-primary p-4 rounded-2xl"
                    >
                      <Check size={20} color="white" />
                    </TouchableOpacity>
                 </View>
              )}

              <View className="h-8" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reminder Setup Wizard Modal */}
      <Modal visible={isReminderSetupVisible} transparent animationType="slide" statusBarTranslucent={true}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[32px] p-6 min-h-[50%]">
             <View className="flex-row items-center justify-between mb-6">
               <Text className="text-white font-bold text-xl" style={{ fontFamily: 'Lexend_700Bold' }}>{t('study_reminder_setup' as any)}</Text>
               <TouchableOpacity onPress={() => setIsReminderSetupVisible(false)} className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center">
                 <X size={16} color="#94a3b8" />
               </TouchableOpacity>
             </View>
             
             <Text className="text-slate-400 text-sm mb-6">{t('study_reminder_setup_desc' as any)}</Text>

             {setupStep === 1 && (
               <View className="flex-1">
                 <Text className="text-white font-bold mb-4">{t('study_reminder_step1' as any)}</Text>
                 <TouchableOpacity onPress={() => setShowTimePicker(true)} className="bg-slate-800 p-4 rounded-2xl items-center border border-slate-700">
                    <Text className="text-white text-2xl font-bold">{setupTime}</Text>
                 </TouchableOpacity>
               </View>
             )}

             {setupStep === 2 && (
               <View className="flex-1">
                 <Text className="text-white font-bold mb-4">{t('study_reminder_step2' as any)}</Text>
                 <ScrollView>
                   {[
                     { value: 0, label: t('no_warning' as any) },
                     { value: 5, label: `5 ${t('minutes_before' as any)}` },
                     { value: 10, label: `10 ${t('minutes_before' as any)}` },
                     { value: 15, label: `15 ${t('minutes_before' as any)}` },
                     { value: -1, label: t('custom_lead_time' as any) },
                   ].map((option) => {
                      const isSelected = option.value === -1 ? isCustomLeadVisible : (!isCustomLeadVisible && setupLead === option.value);
                      return (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            if (option.value === -1) {
                               setIsCustomLeadVisible(true);
                            } else {
                               setIsCustomLeadVisible(false);
                               setSetupLead(option.value);
                            }
                          }}
                          className={`flex-row items-center justify-between p-4 rounded-2xl mb-2 border ${isSelected ? 'bg-primary/20 border-primary' : 'bg-slate-800 border-slate-700'}`}
                        >
                           <Text className={`font-bold ${isSelected ? 'text-primary' : 'text-slate-300'}`}>{option.label}</Text>
                           {isSelected && <Check size={18} color="#3b82f6" />}
                        </TouchableOpacity>
                      );
                   })}

                   {isCustomLeadVisible && (
                     <View className="mt-2 mb-2 flex-row items-center">
                        <TextInput
                          className="flex-1 bg-slate-800 border border-slate-700 p-4 rounded-2xl text-white font-bold"
                          value={customLeadInput}
                          onChangeText={setCustomLeadInput}
                          placeholder="Ex: 45"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() => {
                             const val = parseInt(customLeadInput, 10);
                             if (!isNaN(val) && val >= 0) {
                                 setSetupLead(val);
                                 setIsCustomLeadVisible(false);
                             }
                          }}
                          className="ml-3 bg-primary p-4 rounded-2xl"
                        >
                          <Check size={20} color="white" />
                        </TouchableOpacity>
                     </View>
                   )}

                   <Text className="text-slate-500 text-xs italic mt-2 text-center">{t('no_warning_desc' as any)}</Text>
                 </ScrollView>
               </View>
             )}

             <View className="flex-row justify-between mt-6">
                {setupStep > 1 ? (
                  <TouchableOpacity onPress={() => setSetupStep(setupStep - 1)} className="px-6 py-3 rounded-xl bg-slate-800">
                     <Text className="text-white font-bold">{t('previous' as any)}</Text>
                  </TouchableOpacity>
                ) : <View />}

                {setupStep < 2 ? (
                  <TouchableOpacity onPress={() => setSetupStep(setupStep + 1)} className="px-6 py-3 rounded-xl bg-primary">
                     <Text className="text-white font-bold">{t('next' as any)}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    onPress={async () => {
                       // Always close the modal first, then save in background
                       setIsReminderSetupVisible(false);
                       try {
                         await updateSettings({ studyReminderEnabled: true, studyReminderTime: setupTime, studyReminderLeadMinutes: setupLead });
                         await scheduleStudyReminder(true, setupTime, setupLead, globalSettings.language, true);
                         const summary = setupLead === 0 
                            ? `${setupTime} (${t('exact_time' as any)})` 
                            : `${setupTime} • ${setupLead} ${t('minutes_before' as any)}`;
                         showToast(`${t('reminder_saved' as any)}\n${summary}`, 'success');
                       } catch (err) {
                         console.error('Failed to save reminder:', err);
                         showToast(t('error'), 'error');
                       }
                    }} 
                    className="px-6 py-3 rounded-xl bg-green-500 flex-row items-center"
                  >
                     <Check size={18} color="white" className="mr-2" />
                     <Text className="text-white font-bold">{t('save_reminder' as any)}</Text>
                  </TouchableOpacity>
                )}
             </View>

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

