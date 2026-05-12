/**
 * US-09: NoteCard — Extracted from notes.tsx for maintainability.
 * Displays a note in the list view with title, preview, folder badge and color.
 */
import React from 'react';
import { TouchableOpacity, View, Text, Image as RNImage } from 'react-native';
import { Edit, Folder, X } from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n';

export interface Note {
  id: string;
  type: 'text' | 'draw';
  title: string;
  content: string;
  date: number;
  color?: string;
  folder?: string;
  attachments?: {
    images?: string[];
    videos?: string[];
    voice?: { uri: string; duration?: number }[];
  };
}

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onDelete: () => void;
}

export const NoteCard = ({ note, onPress, onDelete }: NoteCardProps) => {
  const { t } = useTranslation();
  const hasImage = note.attachments?.images && note.attachments.images.length > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderColor: note.color ? note.color : 'rgba(255, 255, 255, 0.08)',
      }}
      className="p-5 rounded-[32px] border-2 mb-1 overflow-hidden"
    >
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
          {new Date(note.date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}
        </Text>
        <TouchableOpacity onPress={onDelete} className="p-1">
          <X size={14} color="rgba(255, 255, 255, 0.2)" />
        </TouchableOpacity>
      </View>

      <Text className="font-bold text-white text-lg leading-tight mb-2" style={{ fontFamily: 'Lexend_600SemiBold' }}>
        {note.title || (note.type === 'draw' ? 'Mon Dessin' : t('untitled_note'))}
      </Text>

      {note.type === 'draw' && hasImage ? (
        <View className="mb-4">
          <RNImage
            source={{ uri: note.attachments?.images![note.attachments!.images!.length - 1] }}
            className="w-full h-48 rounded-3xl bg-white"
            resizeMode="contain"
          />
          <View className="absolute top-3 left-3 bg-purple-600 px-3 py-1 rounded-full shadow-lg">
            <Text className="text-[8px] text-white font-bold uppercase tracking-widest">Dessin</Text>
          </View>
        </View>
      ) : (
        <Text className="text-sm text-white/60 leading-5 mb-4" numberOfLines={4}>
          {note.content.replace(/[#*`]/g, '') || t('no_content')}
        </Text>
      )}

      <View className="flex-row justify-between items-center mt-2">
        {note.folder ? (
          <View className="bg-white/10 px-3 py-1.5 rounded-full border border-white/5 flex-row items-center">
            <Folder size={10} color="#94a3b8" className="mr-1.5" />
            <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{note.folder}</Text>
          </View>
        ) : <View />}
        <View className="w-8 h-8 rounded-full bg-white/5 items-center justify-center">
          <Edit size={12} color="#475569" />
        </View>
      </View>

      {note.color && (
        <View style={{ position: 'absolute', top: -20, right: -20, width: 40, height: 40, backgroundColor: note.color, opacity: 0.15, borderRadius: 20 }} />
      )}
    </TouchableOpacity>
  );
};
