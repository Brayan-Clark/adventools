import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Headphones, PlayCircle, FileDown, Share } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { cleanSspmMarkdown } from '@/lib/utils';

interface LessonHeaderProps {
  readingLesson: any;
  selectedQuarterly: any;
  segment: any;
  onShare: () => void;
}

const LessonHeader = ({ readingLesson, selectedQuarterly, segment, onShare }: LessonHeaderProps) => {
  const router = useRouter();

  if (!segment || !readingLesson) return null;

  return (
    <View className="mb-8 rounded-[32px] overflow-hidden border border-white/10 relative shadow-xl shadow-black/30" style={{ minHeight: 250 }}>
      <Image 
        source={{ uri: readingLesson.cover || selectedQuarterly?.covers?.landscape || selectedQuarterly?.covers?.portrait }} 
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <View className="absolute inset-0 bg-slate-950/60" />
      <View className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90" />
      
      <View className="absolute inset-x-0 bottom-0 top-0 p-6 flex-col justify-between">
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <Text className="text-white font-bold text-[10px] uppercase tracking-[0.2em]">{segment.date || readingLesson.startDate}</Text>
          </View>
          
          <View className="flex-row gap-2">
            {/* Audio Media */}
            {readingLesson.audio && readingLesson.audio.length > 0 && (() => {
              const audioObj = readingLesson.audio[0];
              return (
                <TouchableOpacity
                  onPress={() => {
                    router.push({ 
                      pathname: '/audio/player', 
                      params: { 
                        title: audioObj.title || readingLesson.title, 
                        artist: audioObj.artist || selectedQuarterly?.title || 'Sabbath School', 
                        artwork: audioObj.image || selectedQuarterly?.covers?.portrait, 
                        url: audioObj.src || audioObj.url 
                      } 
                    });
                  }}
                  className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center border border-blue-500/30"
                >
                  <Headphones size={18} color="#60a5fa" />
                </TouchableOpacity>
              );
            })()}
            
            {/* Video Media */}
            {readingLesson.video && readingLesson.video.length > 0 && (() => {
              const videoObj = readingLesson.video[0];
              return (
                <TouchableOpacity
                  onPress={() => {
                    router.push({ 
                      pathname: '/video/player', 
                      params: { 
                        title: videoObj.title || readingLesson.title, 
                        url: videoObj.src || videoObj.url, 
                        thumbnail: videoObj.image || videoObj.thumbnail 
                      } 
                    });
                  }}
                  className="w-10 h-10 rounded-full bg-red-500/20 items-center justify-center border border-red-500/30"
                >
                  <PlayCircle size={18} color="#f87171" />
                </TouchableOpacity>
              );
            })()}
            
            {/* PDF Media */}
            {readingLesson.pdf && readingLesson.pdf.length > 0 && (() => {
              const pdfObj = readingLesson.pdf[0];
              return (
                <TouchableOpacity
                  onPress={() => {
                    router.push({ 
                      pathname: '/pdf/viewer', 
                      params: { 
                        uri: pdfObj.src, 
                        title: pdfObj.title || readingLesson.title, 
                        fileName: pdfObj.src.split('/').pop() || 'document.pdf' 
                      } 
                    });
                  }}
                  className="w-10 h-10 rounded-full bg-amber-500/20 items-center justify-center border border-amber-500/30"
                >
                  <FileDown size={18} color="#fbbf24" />
                </TouchableOpacity>
              );
            })()}
            
            {/* Share */}
            <TouchableOpacity onPress={onShare} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center border border-white/20">
              <Share size={18} color="#f8fafc" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View className="mt-8 justify-end">
           <Text className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-2" style={{ fontFamily: 'Lexend_600SemiBold' }}>
              {cleanSspmMarkdown(readingLesson.title)}
           </Text>
           <Text className="text-white text-3xl font-bold leading-tight" style={{ fontFamily: 'Lexend_700Bold' }}>
              {cleanSspmMarkdown(segment.title)}
           </Text>
        </View>
      </View>
    </View>
  );
};

export default LessonHeader;
