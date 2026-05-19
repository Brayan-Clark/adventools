import React from 'react';
import { TouchableOpacity, View, Image as RNImage } from 'react-native';
import { Edit, Folder, X, Pin, Lock } from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n';
import { AppText as Text } from '@/components/ui/AppText';


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
  bgStyle?: {
    color: string;
    pattern: 'blank' | 'ruled' | 'grid' | 'dotted';
  };
  isPinned?: boolean;
  isLocked?: boolean;
  isTrash?: boolean;
  deletedAt?: number;
}

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onDelete: () => void;
}

const isColorDark = (hexColor?: string) => {
  if (!hexColor) return true;
  const c = hexColor.substring(1);
  if (c.length === 3) {
    const r = parseInt(c[0] + c[0], 16);
    const g = parseInt(c[1] + c[1], 16);
    const b = parseInt(c[2] + c[2], 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
  }
  const rgb = parseInt(c, 16);
  if (isNaN(rgb)) return true;
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
};

export const NoteCard = ({ note, onPress, onDelete }: NoteCardProps) => {
  const { t } = useTranslation();
  const hasImage = note.attachments?.images && note.attachments.images.length > 0;
  
  const isDark = isColorDark(note.bgStyle?.color);
  const cardBg = note.bgStyle?.color ? note.bgStyle.color : 'rgba(255, 255, 255, 0.03)';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-white/30' : 'text-slate-500';
  const descTextColor = isDark ? 'text-white/60' : 'text-slate-600';
  const borderCol = note.color ? note.color : (note.bgStyle?.color ? 'rgba(0,0,0,0.15)' : 'rgba(255, 255, 255, 0.08)');

  const isPinned = !!note.isPinned;
  const isLocked = !!note.isLocked;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: cardBg,
        borderColor: borderCol,
      }}
      className="p-5 rounded-[32px] border-2 mb-1 overflow-hidden"
    >
      <View className="flex-row justify-between items-start mb-3">
        <Text className={`text-[10px] font-bold uppercase tracking-widest ${subTextColor}`}>
          {new Date(note.date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}
        </Text>
        <TouchableOpacity onPress={onDelete} className="p-1">
          <X size={14} color={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.3)"} />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center mb-2 flex-wrap">
        {isPinned && <Pin size={14} color="#3b82f6" fill="#3b82f6" className="mr-1.5" />}
        {isLocked && <Lock size={14} color="#f59e0b" className="mr-1.5" />}
        <Text className={`font-bold text-lg leading-tight flex-1 ${textColor}`} style={{ fontFamily: 'Lexend_600SemiBold' }}>
          {note.title || (note.type === 'draw' ? 'Mon Dessin' : t('untitled_note'))}
        </Text>
      </View>

      {note.type === 'draw' && hasImage && !isLocked ? (
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
        <Text className={`text-sm leading-5 mb-4 ${isLocked ? 'text-amber-500/70 font-semibold italic' : descTextColor}`} numberOfLines={4}>
          {isLocked ? "🔒 Note verrouillée de façon sécurisée" : (note.content.replace(/[#*`~]/g, '') || t('no_content'))}
        </Text>
      )}

      <View className="flex-row justify-between items-center mt-2">
        {note.folder ? (
          <View className={`px-3 py-1.5 rounded-full border flex-row items-center ${isDark ? 'bg-white/10 border-white/5' : 'bg-black/5 border-black/5'}`}>
            <Folder size={10} color={isDark ? "#94a3b8" : "#475569"} className="mr-1.5" />
            <Text className={`text-[9px] font-bold uppercase tracking-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{note.folder}</Text>
          </View>
        ) : <View />}
        <View className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
          <Edit size={12} color={isDark ? "#475569" : "#64748b"} />
        </View>
      </View>

      {note.color && (
        <View style={{ position: 'absolute', top: -20, right: -20, width: 40, height: 40, backgroundColor: note.color, opacity: 0.15, borderRadius: 20 }} />
      )}
    </TouchableOpacity>
  );
};
