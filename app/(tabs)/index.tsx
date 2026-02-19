import { loadDatabase } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bookmark, BookOpen, ChevronRight, FileText, History, Music, Settings, Share2, StickyNote } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings } from '@/lib/settings-context';

export default function Home() {
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const [verse, setVerse] = React.useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  React.useEffect(() => {
    async function init() {
      try {
        const db = await loadDatabase('protestant.db', require('../../assets/databases/protestant.db'));
        const candidates = [
          { bid: 23, toko: 23, and: 1 },
          { bid: 26, toko: 29, and: 11 },
          { bid: 43, toko: 3, and: 16 },
        ];
        const pick = candidates[Math.floor(Math.random() * candidates.length)];

        const tables: any = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
        const verseTable = tables.find((t: any) => t.name.endsWith("_andininy"))?.name;
        const bookTable = tables.find((t: any) => t.name.endsWith("_boky"))?.name;

        if (verseTable && bookTable && pick) {
          const result: any = await db.getFirstAsync(`
            SELECT a_and as verse, a_text as text, b_name as book, a_toko as chapter
            FROM ${verseTable}
            JOIN ${bookTable} ON ${verseTable}.a_bid = ${bookTable}.id
            WHERE a_bid = ? AND a_toko = ? AND a_and = ?
          `, [pick.bid || 1, pick.toko || 1, pick.and || 1]);
          if (result) {
            setVerse(result);
          }
        }
      } catch (e) {
        console.error("DB Error", e);
      }
    }
    init();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem('app_history').then(res => {
        if (res) setHistory(JSON.parse(res));
      });
    }, [])
  );

  const hour = new Date().getHours();
  const greeting = hour < 17 ? "Bonjour ☀️" : "Bonsoir 🌙";

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-10">
          <View className="flex-row items-center">
            <Image
              source={require('../../assets/images/Adventiste_logo_colored.png')}
              style={{ width: 40, height: 40, marginRight: 12 }}
              resizeMode="contain"
            />
            <View>
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{greeting}</Text>
              <Text className="text-2xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>Bienvenue !</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/modal')}
            className="w-11 h-11 rounded-full bg-slate-900 border border-slate-800 items-center justify-center relative shadow-lg"
          >
            <Settings size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Hero Verse Card */}
        <View className="relative overflow-hidden rounded-[40px] bg-primary mb-10 shadow-2xl shadow-primary/40">
          {/* Background Decoration */}
          <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
          <View className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/5 rounded-full" />

          <View className="p-8">
            <View className="flex-row items-center justify-between mb-6">
              <View className="bg-white/20 px-3 py-1.5 rounded-full">
                <Text className="text-[10px] font-bold uppercase text-white tracking-widest">Verset du Jour</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (verse) {
                    router.push({
                      pathname: '/share/verset',
                      params: {
                        verseText: verse.text,
                        verseRef: `${verse.book} ${verse.chapter}:${verse.verse}`
                      }
                    });
                  }
                }}
                className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                <Share2 size={14} color="white" />
              </TouchableOpacity>
            </View>

            {verse ? (
              <View>
                <Text className="text-white italic mb-6 leading-8" style={{
                  fontFamily: globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily,
                  fontSize: 20 * (globalSettings.fontSize / 18) // Scaling based on base size
                }}>
                  "{verse.text}"
                </Text>
                <View className="flex-row items-center">
                  <View className="h-[2px] w-6 bg-white/30 mr-3" />
                  <Text className="text-sm font-bold text-blue-100" style={{ fontFamily: 'Lexend_700Bold' }}>
                    {verse.book} {verse.chapter}:{verse.verse}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="py-10 items-center">
                <Text className="text-white/60 font-bold uppercase tracking-tighter">Éveil des écritures...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Feature Grid */}
        <Text className="text-[10px] font-bold uppercase text-slate-500 mb-6 ml-1 tracking-widest">Outils Principaux</Text>
        <View className="flex-row flex-wrap justify-between gap-y-5 mb-12">
          <FeatureCard
            href="/bible"
            title="Bible"
            subtitle="Les Écritures"
            icon={<BookOpen color="#195de6" size={28} />}
            bgColor="bg-blue-500/10"
          />
          <FeatureCard
            href="/hymnes"
            title="Chants"
            subtitle="Louanges"
            icon={<Music color="#ec4899" size={28} />}
            bgColor="bg-pink-500/10"
          />
          <FeatureCard
            href="/pdf"
            title="PDF"
            subtitle="Documents"
            icon={<FileText color="#f59e0b" size={28} />}
            bgColor="bg-amber-500/10"
          />
          <FeatureCard
            href="/notes"
            title="Notes"
            subtitle="Réflexions"
            icon={<StickyNote color="#10b981" size={28} />}
            bgColor="bg-emerald-500/10"
          />
        </View>

        {/* Recent Section - Dynamic */}
        <View className="mb-20">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-lg font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>Récemment lu</Text>
            <TouchableOpacity onPress={async () => {
              setHistory([]);
              await AsyncStorage.removeItem('app_history');
            }}>
              <Text className="text-xs text-primary font-bold">Effacer</Text>
            </TouchableOpacity>
          </View>

          {history.length > 0 ? (
            history.slice(0, 5).map((item, index) => (
              <ActivityItem
                key={index}
                icon={
                  item.type === 'bible' ? <Bookmark color="#195de6" size={18} /> :
                    item.type === 'hymn' ? <Music color="#ec4899" size={18} /> :
                      item.type === 'pdf' ? <FileText color="#f59e0b" size={18} /> :
                        <StickyNote color="#10b981" size={18} />
                }
                title={item.title}
                subtitle={item.subtitle}
                bg="bg-slate-900"
                onPress={() => {
                  if (item.type === 'bible') {
                    router.push({ pathname: '/bible/reader', params: item.params });
                  } else if (item.type === 'hymn') {
                    router.push(`/hymnes/${item.params.id}`);
                  } else if (item.type === 'pdf') {
                    router.push({ pathname: '/pdf/viewer', params: item.params });
                  } else if (item.type === 'note') {
                    router.push({ pathname: '/notes', params: item.params });
                  }
                }}
              />
            ))
          ) : (
            <View className="py-8 bg-slate-900/50 rounded-3xl items-center border border-slate-800/50">
              <History size={24} color="#475569" className="mb-2" />
              <Text className="text-slate-500 text-xs">Aucun historique récent</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureCard({ href, title, subtitle, icon, bgColor }: any) {
  return (
    <Link href={href} asChild>
      <TouchableOpacity className="w-[47%] bg-slate-900 rounded-[30px] p-6 border border-slate-800 shadow-xl">
        <View className={`w-14 h-14 rounded-2xl ${bgColor} items-center justify-center mb-5`}>
          {icon}
        </View>
        <Text className="font-bold text-white text-lg" style={{ fontFamily: 'Lexend_700Bold' }}>{title}</Text>
        <Text className="text-xs text-slate-500" style={{ fontFamily: 'Lexend_400Regular' }}>{subtitle}</Text>
      </TouchableOpacity>
    </Link>
  );
}

function ActivityItem({ icon, title, subtitle, bg, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} className={`flex-row items-center p-4 rounded-3xl ${bg} mb-4 border border-slate-800/50`}>
      <View className="w-11 h-11 rounded-2xl bg-background-dark items-center justify-center mr-4 border border-slate-800">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-bold text-white text-sm" style={{ fontFamily: 'Lexend_600SemiBold' }}>{title}</Text>
        <Text className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">{subtitle}</Text>
      </View>
      <ChevronRight size={16} color="#475569" />
    </TouchableOpacity>
  );
}
