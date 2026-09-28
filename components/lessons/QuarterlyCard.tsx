import React from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CheckCircle, BookOpen, Download, Trash2, RefreshCw } from 'lucide-react-native';
import { cleanSspmMarkdown, formatDateRange } from '@/lib/utils';
import { AppText as Text } from '@/components/ui/AppText';


interface DownloadProgress {
  downloaded: string[];
  expected: number;
  lastUpdate: string;
}

interface QuarterlyCardProps {
  item: any;
  variant: 'list' | 'detail';
  onPress?: () => void;
  onDownload?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  isDownloaded?: boolean;
  isCurrent?: boolean;
  progress?: DownloadProgress;
  downloadingAll?: boolean;
  t: (key: string) => string;
  width?: number;
}

const QuarterlyCard = ({
  item,
  variant,
  onPress,
  onDownload,
  onUpdate,
  onDelete,
  isDownloaded,
  isCurrent,
  progress,
  downloadingAll,
  t,
  width
}: QuarterlyCardProps) => {
  const have = progress?.downloaded?.length ?? 0;
  const expected = progress?.expected ?? 0;
  const isIncomplete = isDownloaded && expected > 0 && have < expected;

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
            <View className={`absolute top-2 right-2 h-6 rounded-full items-center justify-center ${isIncomplete ? 'bg-amber-500 px-2' : 'bg-emerald-500 w-6'}`}>
              {isIncomplete ? (
                <Text className="text-white font-bold text-[9px]">{have}/{expected}</Text>
              ) : (
                <CheckCircle size={14} color="white" />
              )}
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
  const mainLabel = !isDownloaded
    ? t('download_all')
    : isIncomplete
      ? `${have}/${expected} ${t('lessons_unit')}`
      : (isCurrent ? t('updated') : t('offline_available'));

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
            disabled={downloadingAll || isDownloaded}
            className={`flex-row items-center px-4 py-2 rounded-full self-start ${isDownloaded ? (isIncomplete ? 'bg-amber-500/10' : 'bg-emerald-500/10') : 'bg-primary/10'}`}
          >
            {downloadingAll ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : isDownloaded ? (
              <CheckCircle size={14} color={isIncomplete ? '#f59e0b' : '#10b981'} />
            ) : (
              <Download size={14} color="#3b82f6" />
            )}
            <Text className={`ml-2 text-[10px] font-bold ${isDownloaded ? (isIncomplete ? 'text-amber-500' : 'text-emerald-500') : 'text-primary'}`}>
              {mainLabel}
            </Text>
          </TouchableOpacity>

          {/* Top up / refresh: available as soon as the quarterly is downloaded,
              so lessons published later can be fetched without deleting. */}
          {isDownloaded && (
            <TouchableOpacity
              onPress={onUpdate}
              disabled={downloadingAll}
              className={`ml-3 w-8 h-8 rounded-full items-center justify-center border ${isIncomplete ? 'bg-amber-500/10 border-amber-500/30' : 'bg-primary/10 border-primary/20'}`}
            >
              <RefreshCw size={14} color={isIncomplete ? '#f59e0b' : '#3b82f6'} />
            </TouchableOpacity>
          )}

          {isDownloaded && (
            <TouchableOpacity
              onPress={onDelete}
              disabled={downloadingAll}
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
