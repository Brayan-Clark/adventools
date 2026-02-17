import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { loadDatabase } from '@/lib/database';
import { StatusBar } from 'expo-status-bar';

export default function Bible() {
  const router = useRouter();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchBooks() {
      try {
        const db = await loadDatabase('protestant.db', require('../../assets/databases/protestant.db'));
        const tables: any = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
        const bookTable = tables.find((t: any) => t.name.endsWith("_boky"))?.name;

        if (bookTable) {
          const result: any = await db.getAllAsync(`
            SELECT id, b_name as name, b_testid as testamentId 
            FROM ${bookTable} 
            ORDER BY id ASC
          `);
          setBooks(result || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchBooks();
  }, []);

  const filteredBooks = books.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background-dark">
        <ActivityIndicator size="large" color="#195de6" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />
      <View className="px-6 py-6 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 rounded-full bg-slate-900 items-center justify-center border border-slate-800">
            <ArrowLeft size={20} color="#94a3b8" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>Sainte Bible</Text>
        </View>
      </View>

      <View className="px-6 mb-8">
        <View className="relative flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-1 shadow-inner">
          <Search size={18} color="#64748b" />
          <TextInput
            placeholder="Rechercher un livre..."
            placeholderTextColor="#475569"
            className="flex-1 h-12 ml-3 text-white font-medium"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <SectionHeader title="Ancien Testament" />
        <View className="mb-10 bg-slate-900/50 rounded-[35px] overflow-hidden border border-slate-800/50">
          {filteredBooks.filter(b => b.testamentId === 1).map((book, idx, arr) => (
            <BookItem key={book.id} book={book} isLast={idx === arr.length - 1} />
          ))}
        </View>

        <SectionHeader title="Nouveau Testament" />
        <View className="mb-24 bg-slate-900/50 rounded-[35px] overflow-hidden border border-slate-800/50">
          {filteredBooks.filter(b => b.testamentId === 2).map((book, idx, arr) => (
            <BookItem key={book.id} book={book} isLast={idx === arr.length - 1} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="flex-row items-center mb-6 ml-1">
      <View className="h-[2px] w-6 bg-primary mr-3 rounded-full" />
      <Text className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{title}</Text>
    </View>
  );
}

function BookItem({ book, isLast }: any) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push({
        pathname: "/bible/reader",
        params: { bookId: book.id, bookName: book.name, testament: book.testamentId }
      })}
      className={`flex-row justify-between items-center px-6 py-5 ${!isLast ? 'border-b border-slate-800/30' : ''}`}
    >
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-xl bg-primary/5 items-center justify-center mr-4">
          <Text className="text-primary font-bold text-xs">{book.id}</Text>
        </View>
        <View>
          <Text className="text-base font-semibold text-white" style={{ fontFamily: 'Lexend_600SemiBold' }}>{book.name}</Text>
          <Text className="text-[10px] text-slate-500 uppercase tracking-tighter">Bible Protestant</Text>
        </View>
      </View>
      <ChevronRight size={16} color="#475569" />
    </TouchableOpacity>
  );
}
