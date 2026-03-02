import { exportAllAppData, exportUserModifications, importAllAppData, readBackupFile, resetHymnCorrections } from '@/lib/backup-utils';
import { getAvailableBibles } from '@/lib/bible';
import { useSettings } from '@/lib/settings-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  BookOpen,
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
  User,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Settings() {
  const router = useRouter();
  const { settings: globalSettings, updateSettings } = useSettings();
  const [userName, setUserName] = useState('Fianatra Baiboly');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userDepartments, setUserDepartments] = useState<string[]>([]);
  const [isDeptModalVisible, setIsDeptModalVisible] = useState(false);
  const [isNameEditVisible, setIsNameEditVisible] = useState(false);
  const [tempName, setTempName] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [userEDS, setUserEDS] = useState('Lesona Lehibe (+ 35 taona)');
  const [isEDSModalVisible, setIsEDSModalVisible] = useState(false);

  // Import states
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importSummary, setImportSummary] = useState<any[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [installedBibles, setInstalledBibles] = useState<any[]>([]);

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
      // 1. Charger depuis le cache local (AsyncStorage) s'il existe
      const cachedManifest = await AsyncStorage.getItem('pdf_manifest_cache');
      if (cachedManifest) {
        const data = JSON.parse(cachedManifest);
        if (data.departments) setAvailableDepartments(data.departments);
      }

      // 2. Tentative de synchronisation avec GitHub (branche 'data')
      const GITHUB_MANIFEST_URL = `https://raw.githubusercontent.com/Brayan-Clark/adventools/data/assets/docs/manifest.json?t=${Date.now()}`;
      const response = await fetch(GITHUB_MANIFEST_URL);
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData.departments) {
          setAvailableDepartments(remoteData.departments);
          // Mettre à jour le cache
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

  const handleStartImport = async () => {
    const data = await readBackupFile();
    if (!data) return;

    // The backup could be full backup (with a .data property) or just modifications
    const actualData = data.data || data;
    setImportData(actualData);

    // Categorize
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
    // Select all by default
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
        Alert.alert("Information", "Tsy misy sokajy voafidy.");
        return;
      }

      const pairs: [string, string][] = keysToImport.map(k => [k, String(importData[k])]);
      await AsyncStorage.multiSet(pairs);

      setIsImportModalVisible(false);
      Alert.alert("Vita", "Tontolo soa aman-tsara ny fanafarana ny fanovana.");
      loadSettings(); // Refresh UI
    } catch (e) {
      console.error(e);
      Alert.alert("Hadisoana", "Tsy tontolo ny fanafarana.");
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
            icon={<BookOpen size={18} color="#64748b" />}
            label="Classe EDS"
            value={userEDS}
            onPress={() => setIsEDSModalVisible(true)}
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
            rightElement={<Switch value={globalSettings.darkMode ?? true} onValueChange={(v) => updateSettings({ darkMode: v })} trackColor={{ false: '#334155', true: '#195de6' }} />}
          />
          <SettingItem
            icon={<Bell size={18} color="#64748b" />}
            label="Notifications"
            rightElement={<Switch value={globalSettings.notifications ?? true} onValueChange={(v) => updateSettings({ notifications: v })} trackColor={{ false: '#334155', true: '#195de6' }} />}
          />
          <SettingItem
            icon={<Globe size={18} color="#64748b" />}
            label="Langue"
            value={globalSettings.language}
            onPress={() => {
              Alert.alert(
                'Langue',
                'Choisissez votre langue',
                [
                  { text: 'Français', onPress: () => updateSettings({ language: 'Français' }) },
                  { text: 'English', onPress: () => updateSettings({ language: 'English' }) },
                ]
              )
            }}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title="Contenu">
          <SettingItem
            icon={<FileText size={18} color="#64748b" />}
            label="Version de Bible par défaut"
            value={(installedBibles || []).find(b => b?.id === globalSettings?.bibleVersion)?.name || globalSettings?.bibleVersion || "MG65"}
            onPress={() => {
              if (!installedBibles || installedBibles.length === 0) {
                Alert.alert("Info", "Chargement des versions...");
                return;
              }
              Alert.alert(
                "Version par défaut",
                "Choisissez la version de la Bible à ouvrir par défaut",
                installedBibles.map((config) => ({
                  text: `${config.name || config.id} (${config.id})`,
                  onPress: () => updateSettings({ bibleVersion: config.id })
                }))
              )
            }}
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
            icon={<Save size={18} color="#3b82f6" />}
            label="Sauvegarde complète"
            value="Notes, Bible, Profil..."
            onPress={exportAllAppData}
          />
          <SettingItem
            icon={<Download size={18} color="#3b82f6" />}
            label="Restaurer une sauvegarde"
            onPress={importAllAppData}
          />
          <View className="h-4" />
          <SettingItem
            icon={<Save size={18} color="#64748b" />}
            label="Exporter les modifications"
            value="Tout exporter"
            onPress={exportUserModifications}
          />
          <SettingItem
            icon={<Download size={18} color="#64748b" />}
            label="Importer des modifications"
            onPress={handleStartImport}
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
            icon={<Shield size={18} color="#64748b" />}
            label="Politique de confidentialité"
            onPress={() => router.push('/settings/privacy' as any)}
          />
          <SettingItem
            icon={<Heart size={18} color="#ef4444" />}
            label="Faire un Don"
            onPress={() => router.push('/settings/don' as any)}
          />
          <SettingItem
            icon={<CircleHelp size={18} color="#64748b" />}
            label="Centre d'aide"
            value="Par Email"
            onPress={() => Alert.alert('Aide', 'Pour toute assistance, contactez-nous à : brayanraherinandrasana@gmail.com')}
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

      {/* EDS Selection Modal */}
      <Modal visible={isEDSModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] px-6 pt-8 pb-10 max-h-[80%] border-t border-slate-800">
            <View className="flex-row justify-between items-center mb-6 px-2">
              <View>
                <Text className="text-white text-2xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>Classe EDS</Text>
                <Text className="text-slate-500 mt-1">Safidio ny kilasinao amin'ny Sekoly Sabata</Text>
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
      {/* Import Selection Modal */}
      <Modal visible={isImportModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] px-6 pt-8 pb-10 max-h-[85%] border-t border-slate-800">
            <View className="flex-row justify-between items-center mb-6 px-2">
              <View>
                <Text className="text-white text-2xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>Hafarana ny fanovana</Text>
                <Text className="text-slate-500 mt-1">Safidio izay tianao halaina ao anatin'ilay rakitra</Text>
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
                          <Text className="text-xs text-slate-500 mt-1">{group.keys.length} singa ho hafarana</Text>
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
              className="bg-primary p-5 rounded-[24px] items-center shadow-lg shadow-primary/20 flex-row justify-center"
            >
              <Check size={20} color="white" className="mr-2" />
              <Text className="text-white font-bold text-lg">Hanafatra izao</Text>
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
