/**
 * DrawModal — Premium drawing canvas.
 * Features: 6 brush types, smooth bezier curves, undo/redo, opacity,
 * size presets, canvas backgrounds, 24 colors.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, ScrollView, TouchableOpacity, View, Image as RNImage, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Path, Svg, G } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { Check, ChevronDown, ChevronUp, Eraser, Redo2, Trash2, Undo2, X } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { saveFilePermanently } from '@/lib/utils';
import { AppText as Text } from '@/components/ui/AppText';

interface DrawModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (uri: string) => void;
  initialUri?: string;
}

// --- TYPES ---
interface StrokePoint { x: number; y: number; }
interface Stroke {
  points: StrokePoint[];
  color: string;
  width: number;
  opacity: number;
  linecap: 'round' | 'square' | 'butt';
  tool: string;
}

// --- CONSTANTS ---
const TOOLS = [
  { id: 'pen',         label: 'Stylo',      emoji: '🖊️',  opacity: 1.0,  widthMul: 1.0, linecap: 'round'  as const },
  { id: 'brush',       label: 'Pinceau',    emoji: '🖌️',  opacity: 0.7,  widthMul: 2.5, linecap: 'round'  as const },
  { id: 'marker',      label: 'Marqueur',   emoji: '✒️',  opacity: 0.95, widthMul: 1.8, linecap: 'square' as const },
  { id: 'highlighter', label: 'Surligneur', emoji: '🟡',  opacity: 0.35, widthMul: 7.0, linecap: 'square' as const },
  { id: 'pencil',      label: 'Crayon',     emoji: '✏️',  opacity: 0.65, widthMul: 1.0, linecap: 'round'  as const },
  { id: 'calligraphy', label: 'Calligrap.', emoji: '🎴',  opacity: 0.90, widthMul: 2.0, linecap: 'butt'   as const },
  { id: 'eraser',      label: 'Gomme',      emoji: '⬜',  opacity: 1.0,  widthMul: 3.0, linecap: 'round'  as const },
];

const SIZE_PRESETS = [2, 5, 10, 18, 30];

const COLORS = [
  '#FFFFFF', '#E2E8F0', '#94A3B8', '#475569', '#1E293B', '#000000',
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#3B82F6',
  '#8B5CF6', '#EC4899', '#F43F5E', '#06B6D4', '#10B981', '#84CC16',
  '#FCD34D', '#FDBA74', '#86EFAC', '#93C5FD', '#C4B5FD', '#F9A8D4',
];

const BACKGROUNDS = [
  { id: 'dark',   color: '#020617', label: 'Sombre' },
  { id: 'black',  color: '#000000', label: 'Noir' },
  { id: 'white',  color: '#FFFFFF', label: 'Blanc' },
  { id: 'paper',  color: '#FDF6E3', label: 'Papier' },
  { id: 'navy',   color: '#0F172A', label: 'Marine' },
];

// --- SMOOTH PATH BUILDER (Bezier curves) ---
function buildSmoothPath(points: StrokePoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y} L${points[0].x + 0.1},${points[0].y}`;
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q${points[i].x},${points[i].y} ${midX},${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L${last.x},${last.y}`;
  return d;
}

// Calligraphy: variable width based on horizontal vs vertical movement
function buildCalligraphyPath(points: StrokePoint[], baseWidth: number): string {
  if (points.length < 2) return buildSmoothPath(points);
  // Build a ribbon shape by offsetting perpendicular to stroke direction
  const ribbons: string[] = [];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len; // normal x
    const ny = dx / len;  // normal y
    const w = Math.max(1, baseWidth * Math.abs(Math.cos(Math.atan2(dy, dx))));
    ribbons.push(
      `M${points[i - 1].x + nx * w},${points[i - 1].y + ny * w}` +
      ` L${points[i].x + nx * w},${points[i].y + ny * w}` +
      ` L${points[i].x - nx * w},${points[i].y - ny * w}` +
      ` L${points[i - 1].x - nx * w},${points[i - 1].y - ny * w} Z`
    );
  }
  return ribbons.join(' ');
}

// --- COMPONENT ---
export const DrawModal = ({ visible, onClose, onSave, initialUri }: DrawModalProps) => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<StrokePoint[]>([]);

  const [activeTool, setActiveTool] = useState('pen');
  const [color, setColor] = useState('#3B82F6');
  const [sizeIndex, setSizeIndex] = useState(1);
  const [bgId, setBgId] = useState('dark');
  const [showBgPicker, setShowBgPicker] = useState(false);

  const viewShotRef = useRef<any>(null);

  // ── REFS for PanResponder (avoids stale closure bug) ──
  const colorRef     = useRef(color);
  const toolRef      = useRef(activeTool);
  const sizeIdxRef   = useRef(sizeIndex);
  const bgIdRef2     = useRef(bgId);

  useEffect(() => { colorRef.current   = color;       }, [color]);
  useEffect(() => { toolRef.current    = activeTool;  }, [activeTool]);
  useEffect(() => { sizeIdxRef.current = sizeIndex;   }, [sizeIndex]);
  useEffect(() => { bgIdRef2.current   = bgId;        }, [bgId]);

  useEffect(() => {
    if (visible) {
      setStrokes([]);
      setRedoStack([]);
      setCurrentPoints([]);
    }
  }, [visible]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPoints([{ x: locationX, y: locationY }]);
      setRedoStack([]);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPoints(prev => [...prev, { x: locationX, y: locationY }]);
    },
    onPanResponderRelease: () => {
      // Read from refs — always current values
      const currentToolId = toolRef.current;
      const currentTool   = TOOLS.find(t => t.id === currentToolId) || TOOLS[0];
      const currentIsEraser = currentToolId === 'eraser';
      const currentBg     = BACKGROUNDS.find(b => b.id === bgIdRef2.current) || BACKGROUNDS[0];
      const currentColor  = currentIsEraser ? currentBg.color : colorRef.current;
      const currentWidth  = SIZE_PRESETS[sizeIdxRef.current] * currentTool.widthMul;

      setCurrentPoints(prev => {
        if (prev.length > 0) {
          setStrokes(s => [...s, {
            points: prev,
            color: currentColor,
            width: currentWidth,
            opacity: currentTool.opacity,
            linecap: currentTool.linecap,
            tool: currentToolId,
          }]);
        }
        return [];
      });
    },
  })).current;

  const undo = () => {
    setStrokes(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack(r => [last, ...r]);
      return prev.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setStrokes(s => [...s, next]);
      return rest;
    });
  };

  const handleSave = async () => {
    if (viewShotRef.current) {
      try {
        const uri = await viewShotRef.current.capture();
        const permanentUri = await saveFilePermanently(uri, 'image');
        onSave(permanentUri);
      } catch (e) {
        console.error('Capture failed', e);
      }
    }
  };

  const bg = BACKGROUNDS.find(b => b.id === bgId) || BACKGROUNDS[0];

  const renderStroke = (s: Stroke, key: number) => {
    if (s.tool === 'calligraphy') {
      return (
        <Path
          key={key}
          d={buildCalligraphyPath(s.points, s.width / 2)}
          fill={s.color}
          fillOpacity={s.opacity}
          stroke="none"
        />
      );
    }
    return (
      <Path
        key={key}
        d={buildSmoothPath(s.points)}
        stroke={s.tool === 'eraser' ? bg.color : s.color}
        strokeWidth={s.width}
        strokeOpacity={s.opacity}
        strokeLinecap={s.linecap}
        strokeLinejoin="round"
        fill="none"
      />
    );
  };

  // Derive display values from state (for UI rendering only)
  const tool        = TOOLS.find(t => t.id === activeTool) || TOOLS[0];
  const isEraser    = activeTool === 'eraser';
  const strokeColor = isEraser ? bg.color : color;
  const strokeWidth = SIZE_PRESETS[sizeIndex] * tool.widthMul;

  const currentStrokePath = currentPoints.length > 0
    ? (activeTool === 'calligraphy'
      ? buildCalligraphyPath(currentPoints, strokeWidth / 2)
      : buildSmoothPath(currentPoints))
    : '';

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: bg.color }}>

        {/* ── TOP BAR ── */}
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
            <X size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={undo} disabled={strokes.length === 0} className={cn("w-10 h-10 rounded-full bg-white/10 items-center justify-center", strokes.length === 0 && "opacity-30")}>
              <Undo2 size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={redo} disabled={redoStack.length === 0} className={cn("w-10 h-10 rounded-full bg-white/10 items-center justify-center", redoStack.length === 0 && "opacity-30")}>
              <Redo2 size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStrokes([]); setRedoStack([]); }} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
              <Trash2 size={18} color="#f87171" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} className="px-5 h-10 rounded-full bg-blue-600 items-center justify-center">
              <Text className="text-white font-bold text-sm">Sauver</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CANVAS ── */}
        <ViewShot ref={viewShotRef} style={{ flex: 1, backgroundColor: bg.color }} options={{ format: 'jpg', quality: 0.95 }}>
          <View className="flex-1" {...panResponder.panHandlers}>
            {initialUri && (
              <RNImage source={{ uri: initialUri }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 1 }} resizeMode="cover" />
            )}
            <Svg style={{ flex: 1 }}>
              <G>{strokes.map((s, i) => renderStroke(s, i))}</G>
              {currentStrokePath ? (
                activeTool === 'calligraphy' ? (
                  <Path d={currentStrokePath} fill={strokeColor} fillOpacity={tool.opacity} stroke="none" />
                ) : (
                  <Path d={currentStrokePath} stroke={strokeColor} strokeWidth={strokeWidth} strokeOpacity={tool.opacity} strokeLinecap={tool.linecap} strokeLinejoin="round" fill="none" />
                )
              ) : null}
            </Svg>
          </View>
        </ViewShot>

        {/* ── BOTTOM TOOLBAR ── */}
        <View style={{ backgroundColor: 'rgba(15,23,42,0.97)' }} className="border-t border-white/10 pb-8 pt-3 px-4">

          {/* Background picker (collapsible) */}
          {showBgPicker && (
            <View className="flex-row gap-3 mb-3 justify-center">
              {BACKGROUNDS.map(b => (
                <TouchableOpacity
                  key={b.id}
                  onPress={() => { setBgId(b.id); setShowBgPicker(false); }}
                  style={{ backgroundColor: b.color, borderWidth: bgId === b.id ? 2 : 1, borderColor: bgId === b.id ? '#3b82f6' : 'rgba(255,255,255,0.2)' }}
                  className="w-10 h-10 rounded-full items-center justify-center"
                >
                  {bgId === b.id && <View className="w-3 h-3 rounded-full bg-blue-500" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Row 1: Tools */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2">
              {TOOLS.map(t => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setActiveTool(t.id)}
                  className={cn("items-center px-3 py-2 rounded-2xl border", activeTool === t.id ? "bg-blue-600/30 border-blue-500" : "bg-white/5 border-white/10")}
                >
                  <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                  <Text style={{ fontSize: 9, fontFamily: 'Lexend_400Regular' }} className={cn("mt-0.5 font-bold uppercase tracking-wider", activeTool === t.id ? "text-blue-400" : "text-white/40")}>{t.label}</Text>
                </TouchableOpacity>
              ))}
              {/* BG toggle */}
              <TouchableOpacity
                onPress={() => setShowBgPicker(v => !v)}
                className={cn("items-center px-3 py-2 rounded-2xl border", showBgPicker ? "bg-slate-600/30 border-slate-400" : "bg-white/5 border-white/10")}
              >
                <View style={{ backgroundColor: bg.color, width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }} />
                <Text style={{ fontSize: 9, fontFamily: 'Lexend_400Regular' }} className="text-white/40 mt-0.5 font-bold uppercase tracking-wider">Fond</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Row 2: Colors */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2 items-center">
              {COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => { setColor(c); if (activeTool === 'eraser') setActiveTool('pen'); }}
                  style={{ backgroundColor: c, borderWidth: color === c && !isEraser ? 2.5 : 1, borderColor: color === c && !isEraser ? 'white' : 'rgba(255,255,255,0.15)' }}
                  className="w-8 h-8 rounded-full"
                />
              ))}
            </View>
          </ScrollView>

          {/* Row 3: Size presets */}
          <View className="flex-row items-center gap-3">
            <Text style={{ fontSize: 10, fontFamily: 'Lexend_400Regular' }} className="text-white/30 font-bold uppercase tracking-wider">Taille</Text>
            <View className="flex-row gap-3 flex-1">
              {SIZE_PRESETS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSizeIndex(i)}
                  className={cn("items-center justify-center flex-1 h-10 rounded-2xl border", sizeIndex === i ? "bg-blue-600/20 border-blue-500" : "bg-white/5 border-white/10")}
                >
                  <View
                    style={{
                      width: Math.min(s * 1.5, 24),
                      height: Math.min(s * 1.5, 24),
                      borderRadius: 999,
                      backgroundColor: isEraser ? '#94a3b8' : color,
                    }}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {/* Opacity indicator */}
            <View className="items-center">
              <Text style={{ fontSize: 10, fontFamily: 'Lexend_400Regular' }} className="text-white/30 font-bold uppercase tracking-wider">Opacité</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Lexend_700Bold' }} className="text-white font-bold">{Math.round(tool.opacity * 100)}%</Text>
            </View>
          </View>
        </View>

      </SafeAreaView>
    </Modal>
  );
};
