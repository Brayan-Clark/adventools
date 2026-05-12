import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CheckCircle, BookOpen, Download, Trash2 } from 'lucide-react-native';
import { cleanSspmMarkdown, formatDateRange } from '@/lib/utils';

interface QuarterlyCardProps {
  item: any;
  variant: 'list' | 'detail';
  onPress?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  isDownloaded?: boolean;
  isCurrent?: boolean;
  downloadingAll?: boolean;
  t: (key: string) => string;
  width?: number;
}

const QuarterlyCard = ({ 
  item, 
  variant, 
  onPress, 
  onDownload, 
  onDelete, 
  isDownloaded, 
  isCurrent, 
  downloadingAll, 
  t, 
  width 
}: QuarterlyCardProps) => {
  if (variant === 'list') {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{ width: width ? (width - 60) / 2 : '48%' }}
        className="bg-slate-900 rounded-[24px] overflow-hidden border border-slate-800 mb-6"
      >
        <View className="relative">
          <Image source={{ uri: item.covers.portrait }} className="w-full h-48" resizeMode="cover" />
          {isDownloaded && (
            <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
              <CheckCircle size={14} color="white" />
            </View>
          )}
        </View>
        <View className="p-4">
          <Text className="text-primary font-bold text-[8px] uppercase tracking-widest mb-1" numberOfLines={1}>
            {formatDateRange(item.startDate, item.endDate)}
          </Text>
          <Text className="text-white font-bold text-sm leading-5 h-10" numberOfLines={2} style={{ fontFamily: 'Lexend_600SemiBold' }}>
            {cleanSspmMarkdown(item.title)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Detail Variant
  return (
    <View className="bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 mb-8 p-6 flex-row items-center">
      {item.covers?.portrait ? (
        <Image source={{ uri: item.covers.portrait }} className="w-20 h-28 rounded-lg mr-4" />
      ) : (
        <View className="w-20 h-28 rounded-lg mr-4 bg-slate-800 items-center justify-center">
          <BookOpen size={24} color="#475569" />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-white font-bold text-lg mb-1">{cleanSspmMarkdown(item.title)}</Text>
        <Text className="text-slate-500 text-xs leading-5" numberOfLines={3}>{item.description}</Text>

        <View className="flex-row items-center mt-4">
          <TouchableOpacity
            onPress={onDownload}
            disabled={downloadingAll || (isDownloaded && !isCurrent)}
            className={`flex-row items-center px-4 py-2 rounded-full self-start ${isDownloaded ? 'bg-emerald-500/10' : 'bg-primary/10'}`}
          >
            {downloadingAll ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : isDownloaded ? (
              <CheckCircle size={14} color="#10b981" />
            ) : (
              <Download size={14} color="#3b82f6" />
            )}
            <Text className={`ml-2 text-[10px] font-bold ${isDownloaded ? 'text-emerald-500' : 'text-primary'}`}>
              {isDownloaded ? (isCurrent ? t('updated') : t('offline_available')) : t('download_all')}
            </Text>
          </TouchableOpacity>

          {isDownloaded && (
            <TouchableOpacity
              onPress={onDelete}
              className="ml-3 w-8 h-8 rounded-full bg-red-500/10 items-center justify-center border border-red-500/20"
            >
              <Trash2 size={14} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default QuarterlyCard;
