import { BIBLE_REGEX, fetchVerseContent } from '@/lib/bible';
import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import { deleteNoteFromDb, getAllNotes, getFolders, saveFolders, saveHistory, saveNote } from '@/lib/user-storage';
import { cn, saveFilePermanently } from '@/lib/utils';
import { AudioPlayer, VideoPlayer, DrawModal, NoteCard } from '@/components/notes';
import { Audio } from 'expo-av';
import { useVideoPlayer, VideoView } from 'expo-video';

import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Print from 'expo-print';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, BookOpen, Camera, Check, ChevronRight, Edit, Eraser, Folder, Footprints, Heading, Highlighter, Italic, LayoutGrid, List, Lock, Mic, Music, Palette, Paperclip, Pause, Play, Plus, Pin, Printer, Redo2, Search, Share2, Square, Star, StickyNote, Trash2, Undo2, Unlock, User, Video, X, Maximize2, Minimize2, Pointer, Activity, Zap } from 'lucide-react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Image as RNImage, ScrollView, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';

// --- STYLES & CONSTANTS ---

const HIGHLIGHT_COLORS = [
    { id: 'yellow', bg: 'rgba(253, 224, 71, 0.3)', text: '#fde047', border: 'rgba(253, 224, 71, 0.4)' },
    { id: 'green', bg: 'rgba(74, 222, 128, 0.3)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.4)' },
    { id: 'blue', bg: 'rgba(96, 165, 250, 0.3)', text: '#60a5fa', border: 'rgba(96, 165, 250, 0.4)' },
    { id: 'red', bg: 'rgba(248, 113, 113, 0.3)', text: '#f87171', border: 'rgba(248, 113, 113, 0.4)' },
    { id: 'purple', bg: 'rgba(167, 139, 250, 0.3)', text: '#a78bfa', border: 'rgba(167, 139, 250, 0.4)' },
    { id: 'cyan', bg: 'rgba(34, 211, 238, 0.3)', text: '#22d3ee', border: 'rgba(34, 211, 238, 0.4)' },
];

const TEXT_FONTS = [
    { id: 'Lexend_400Regular', label: 'Lexend', preview: 'Aa' },
    { id: 'Inter_400Regular', label: 'Inter', preview: 'Aa' },
    { id: 'Poppins_400Regular', label: 'Poppins', preview: 'Aa' },
    { id: 'OpenSans', label: 'Open Sans', preview: 'Aa' },
    { id: 'Lora_400Regular', label: 'Lora', preview: 'Aa' },
    { id: 'Serif', label: 'Serif', preview: 'Aa' },
    { id: 'Alice', label: 'Alice', preview: 'Aa' },
    { id: 'Comfortaa', label: 'Comfortaa', preview: 'Aa' },
    { id: 'Monospace', label: 'Mono', preview: 'Aa' },
    { id: 'Comic', label: 'Comic', preview: 'Aa' },
    { id: 'Allura', label: 'Allura', preview: 'Aa' },
    { id: 'Rosemary', label: 'Rosemary', preview: 'Aa' },
];

const TEXT_SIZES = [
    { id: 16, label: 'Petit' },
    { id: 18, label: 'Normal' },
    { id: 20, label: 'Grand' },
    { id: 24, label: 'Énorme' }
];

const TEXT_ALIGNS = [
    { id: 'left', label: 'Gauche' },
    { id: 'center', label: 'Centré' },
    { id: 'right', label: 'Droite' },
    { id: 'justify', label: 'Justifié' }
];

const NOTE_COLORS = [
    { label: 'Slate', value: '#1e293b', border: '#334155' },
    { label: 'Azure', value: '#1e3a8a', border: '#1e40af' },
    { label: 'Indigo', value: '#312e81', border: '#3730a3' },
    { label: 'Emerald', value: '#064e3b', border: '#065f46' },
    { label: 'Teal', value: '#134e4a', border: '#0f766e' },
    { label: 'Rose', value: '#881337', border: '#9f1239' },
    { label: 'Crimson', value: '#7f1d1d', border: '#b91c1c' },
    { label: 'Amber', value: '#78350f', border: '#92400e' },
    { label: 'Brown', value: '#451a03', border: '#78350f' },
    { label: 'Violet', value: '#4c1d95', border: '#5b21b6' },
];

import { LaserPointerOverlay } from '@/components/notes/LaserPointerOverlay';
import { AppText as Text } from '@/components/ui/AppText';
import { BackHandler } from 'react-native';

const FULL_PALETTE = [
    '#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#f1f5f9',
    '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca',
    '#7c2d12', '#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7',
    '#064e3b', '#065f46', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0',
    '#0c4a6e', '#075985', '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd',
    '#1e3a8a', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe',
    '#4c1d95', '#5b21b6', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ede9fe',
    '#831843', '#9d174d', '#be123c', '#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#fff1f2',
];

const NOTE_TEMPLATES = [
    {
        id: 'blank',
        title: 'Note Vierge',
        icon: '\uD83D\uDCDD',
        description: 'Une page blanche pour vos pens\u00e9es spontan\u00e9es.',
        content: '',
        color: '#1e293b'
    },
    {
        id: 'bible_study',
        title: '\u00c9tude Biblique (SOAP)',
        icon: '\uD83D\uDCDA',
        description: 'M\u00e9thode SOAP pour approfondir les \u00c9critures.',
        content: `# \uD83D\uDCDA \u00c9tude Biblique\n\n**Passage :** \n**Version :**  \n**Date :** ${new Date().toLocaleDateString('fr-FR')}\n\n---\n\n## S — Scripture (\u00c9criture)\n> *Copiez ici le verset ou le passage qui vous a touch\u00e9...*\n\n\n## O — Observation\n*Qu\'est-ce que ce passage dit exactement ? Qui ? Quoi ? O\u00f9 ? Quand ?*\n\n\n## A — Application\n*Comment ce passage s\'applique-t-il \u00e0 ma vie aujourd\'hui ?*\n\n\n## P — Pray\u00e8re\n*Ma r\u00e9ponse \u00e0 Dieu en lien avec ce que j\'ai lu...*\n\n---\n> "Votre parole est une lampe \u00e0 mes pieds, et une lumi\u00e8re sur mon sentier." — Psaume 119:105\n`,
        color: '#1e3a8a'
    },
    {
        id: 'sermon',
        title: 'Notes de Pr\u00e9dication',
        icon: '\u26EA',
        description: 'Prenez des notes structur\u00e9es pendant le culte.',
        content: `# \u26EA Notes de Pr\u00e9dication\n\n**Date :** ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n**Pr\u00e9dicateur :**\n**Th\u00e8me principal :**\n**Texte de base :**\n\n---\n\n## \uD83D\uDD11 Introduction\n\n\n## \uD83D\uDCD6 Points Principaux\n\n### 1.\n\n### 2.\n\n### 3.\n\n## \uD83D\uDCDC Versets Cit\u00e9s\n- \n- \n\n## \u2728 Conclusion & Appel\n\n\n## \uD83C\uDF31 Application Personnelle\n*Ce que je dois mettre en pratique cette semaine :*\n\n`,
        color: '#4c1d95'
    },
    {
        id: 'journal',
        title: 'Journal Spirituel',
        icon: '\u2600\uFE0F',
        description: 'Enregistrez votre marche avec Dieu quotidiennement.',
        content: `# \u2600\uFE0F Journal du ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}\n\n## \uD83D\uDE4C Gratitude\n*Aujourd\'hui, je suis reconnaissant pour :*\n1. \n2. \n3. \n\n## \uD83D\uDCD6 Lecture du Jour\n**Passage :**\n*Ce qui m\'a touch\u00e9 :*\n\n\n## \uD83D\uDE4F Pri\u00e8re du Matin\n\n\n## \uD83D\uDCAA D\u00e9fis & Victoires\n*Ce que j\'ai v\u00e9cu aujourd\'hui :*\n\n\n## \uD83C\uDFAF Engagement de Demain\n*Demain, par la gr\u00e2ce de Dieu, je veux...\n\n`,
        color: '#064e3b'
    },
    {
        id: 'prayer',
        title: 'Journal de Pri\u00e8re',
        icon: '\uD83D\uDE4F',
        description: 'Suivez vos demandes et vos r\u00e9ponses de Dieu.',
        content: `# \uD83D\uDE4F Journal de Pri\u00e8re — ${new Date().toLocaleDateString('fr-FR')}\n\n## \uD83D\uDCCB Demandes\n| Sujet | Date | Statut |\n|---|---|---|\n| | ${new Date().toLocaleDateString('fr-FR')} | En attente |\n| | | |\n\n## \u2705 R\u00e9ponses Re\u00e7ues\n*Les fid\u00e9lit\u00e9s que j\'ai vues :*\n\n\n## \uD83D\uDC97 Intercession\n*Je prie pour :*\n- \n- \n\n## \uD83E\uDD1D Ma Confiance\n> "Ne vous inqui\u00e9tez de rien; mais en toute chose faites connaitre vos besoins \u00e0 Dieu." — Phil 4:6\n\n`,
        color: '#7c3aed'
    },
    {
        id: 'sabbath',
        title: 'Pr\u00e9paration du Sabbat',
        icon: '\u2728',
        description: 'Pr\u00e9parez votre c\u0153ur et votre maison pour le Sabbat.',
        content: `# \u2728 Pr\u00e9paration du Sabbat\n\n**Date :** Vendredi ${new Date().toLocaleDateString('fr-FR')}\n**Coucher du soleil :**\n\n---\n\n## \uD83C\uDFE0 Pr\u00e9paration Pratique\n- [ ] M\u00e9nage et maison pr\u00eate\n- [ ] Rep\u00e0s pr\u00e9par\u00e9s\n- [ ] V\u00eatements sortis\n- [ ] \u00c9tude de la le\u00e7on termin\u00e9e\n\n## \uD83D\uDCDA \u00c9tude de la Le\u00e7on\n**Le\u00e7on N\u00b0 :** \n**Th\u00e8me :**\n*Mes r\u00e9flexions :*\n\n\n## \uD83D\uDE4F Pr\u00e8re d\'Entr\u00e9e dans le Sabbat\n\n\n## \uD83C\uDF1F Ce Que J\'Attends de Ce Sabbat\n\n`,
        color: '#b45309'
    },
    {
        id: 'evangelism',
        title: 'Rapport d\'\u00c9vang\u00e9lisation',
        icon: '\uD83C\uDF0D',
        description: 'Documentez vos contacts et visites missionnaires.',
        content: `# \uD83C\uDF0D Rapport d\'\u00c9vang\u00e9lisation\n\n**Date :** ${new Date().toLocaleDateString('fr-FR')}\n**Zone / Quartier :**\n\n---\n\n## \uD83D\uDC65 Contacts Rencontr\u00e9s\n| Nom | Adresse | Besoin | Suivi |\n|---|---|---|---|\n| | | | |\n| | | | |\n\n## \uD83D\uDCDA Litt\u00e9rature Distribu\u00e9e\n- \n\n## \uD83D\uDE4F Pri\u00e8res Partag\u00e9es\n- \n\n## \uD83D\uDCCB Prochaines \u00c9tapes\n- [ ] \n- [ ] \n\n## \uD83D\uDCA1 R\u00e9flexion\n*Ce que Dieu m\'a enseign\u00e9 aujourd\'hui :*\n\n`,
        color: '#065f46'
    },
    {
        id: 'meeting',
        title: 'Notes de R\u00e9union',
        icon: '\uD83D\uDCC5',
        description: 'Comptes-rendus pour comit\u00e9s et r\u00e9unions d\'\u00e9glise.',
        content: `# \uD83D\uDCC5 Notes de R\u00e9union\n\n**Titre :**\n**Date :** ${new Date().toLocaleDateString('fr-FR')}\n**Lieu :**\n**Pr\u00e9sid\u00e9 par :**\n**Participants :**\n\n---\n\n## \uD83D\uDCCB Ordre du Jour\n1. \n2. \n3. \n\n## \uD83D\uDDE3\uFE0F D\u00e9lances & D\u00e9cisions\n| N\u00b0 | Sujet | D\u00e9cision | Responsable | D\u00e9lai |\n|---|---|---|---|---|\n| 1 | | | | |\n\n## \uD83D\uDCCC Points \u00e0 Suivre\n- [ ] \n\n## \uD83D\uDDD3\uFE0F Prochaine R\u00e9union\n**Date :**\n**Ordre du jour pr\u00e9vu :**\n\n`,
        color: '#1e293b'
    },
];

// Helper to convert HSV to HEX (simplified)
const hsvToHex = (h: number, s: number, v: number) => {
    s /= 100; v /= 100;
    const k = (n: number) => (n + h / 60) % 6;
    const f = (n: number) => v * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
    const rgb = [f(5), f(3), f(1)].map(x => Math.floor(x * 255).toString(16).padStart(2, '0'));
    return `#${rgb.join('')}`.toUpperCase();
};

// --- TYPES ---

interface Note {
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
        voice?: { uri: string, duration?: number }[];
    };
    bgStyle?: {
        color: string;
        pattern: 'blank' | 'ruled' | 'grid' | 'dotted';
    };
    textStyle?: {
        fontFamily?: string;
        fontSize?: number;
        textAlign?: 'left' | 'center' | 'right' | 'justify';
    };
    isPinned?: boolean;
    isLocked?: boolean;
    isTrash?: boolean;
    deletedAt?: number;
}

const PAPER_PATTERNS = [
    { id: 'blank', label: 'Vierge', icon: 'StickyNote' },
    { id: 'ruled', label: 'Ligné', icon: 'List' },
    { id: 'grid', label: 'Quadrillé', icon: 'LayoutGrid' },
    { id: 'dotted', label: 'Points', icon: 'Heading' }
];

const PAPER_COLORS = [
    { label: 'Sombre Classique', value: '#0d1117', isDark: true },
    { label: 'Slate Ardoise', value: '#1e293b', isDark: true },
    { label: 'Émeraude Profond', value: '#042f24', isDark: true },
    { label: 'Bleu Royal', value: '#0f172a', isDark: true },
    { label: 'Papier Sepia', value: '#fcf8eb', isDark: false },
    { label: 'Papier Ivoire', value: '#fcfaf2', isDark: false },
    { label: 'Nuage Clair', value: '#f8fafc', isDark: false },
];

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

const PaperBackground = ({ pattern, color }: { pattern: 'blank' | 'ruled' | 'grid' | 'dotted', color: string }) => {
    if (pattern === 'blank') return null;
    const isDark = isColorDark(color);
    const strokeColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const dotColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';

    return (
        <View className="absolute inset-0 pointer-events-none" style={{ backgroundColor: color }}>
            {pattern === 'ruled' && (
                <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
                    {Array.from({ length: 150 }).map((_, i) => (
                        <Path key={i} d={`M0,${(i + 1) * 36} L2000,${(i + 1) * 36}`} stroke={strokeColor} strokeWidth="1" />
                    ))}
                </Svg>
            )}
            {pattern === 'grid' && (
                <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
                    {Array.from({ length: 100 }).map((_, i) => (
                        <React.Fragment key={i}>
                            <Path d={`M0,${(i + 1) * 28} L2000,${(i + 1) * 28}`} stroke={strokeColor} strokeWidth="1" />
                            <Path d={`M${(i + 1) * 28},0 L${(i + 1) * 28},4000`} stroke={strokeColor} strokeWidth="1" />
                        </React.Fragment>
                    ))}
                </Svg>
            )}
            {pattern === 'dotted' && (
                <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
                    {Array.from({ length: 120 }).map((_, r) => 
                        Array.from({ length: 30 }).map((_, c) => (
                            <Path key={`${r}-${c}`} d={`M${(c + 1) * 28},${(r + 1) * 28} h0.1`} stroke={dotColor} strokeWidth="2.5" strokeLinecap="round" />
                        ))
                    )}
                </Svg>
            )}
        </View>
    );
};

// Map each font to its bold variant (or itself if no bold variant loaded)
const FONT_BOLD_MAP: Record<string, string> = {
    'Lexend_400Regular': 'Lexend_700Bold',
    'Inter_400Regular': 'Inter_700Bold',
    'Poppins_400Regular': 'Poppins_700Bold',
    'Lora_400Regular': 'Lora_700Bold',
    // Fonts without separate bold variant - will use fontWeight synthetically
    'OpenSans': 'OpenSans',
    'Serif': 'Serif',
    'Alice': 'Alice',
    'Comfortaa': 'Comfortaa',
    'Monospace': 'Monospace',
    'Comic': 'Comic',
    'Allura': 'Allura',
    'Rosemary': 'Rosemary',
};

const FONT_HAS_BOLD_VARIANT = new Set([
    'Lexend_400Regular', 'Inter_400Regular', 'Poppins_400Regular', 'Lora_400Regular'
]);

const getMarkdownStyles = (isDark: boolean, fontFamily: string = 'Lexend_400Regular') => {
    const boldFont = FONT_BOLD_MAP[fontFamily] || fontFamily;
    const hasBoldVariant = FONT_HAS_BOLD_VARIANT.has(fontFamily);
    return {
    body: { color: isDark ? '#e2e8f0' : '#1e293b', fontSize: 18, lineHeight: 32, fontFamily },
    heading1: { color: isDark ? '#ffffff' : '#0f172a', fontSize: 28, fontFamily: hasBoldVariant ? boldFont : fontFamily, fontWeight: hasBoldVariant ? 'normal' : ('700' as any), marginTop: 20, marginBottom: 10 },
    heading2: { color: isDark ? '#60a5fa' : '#2563eb', fontSize: 24, fontFamily: hasBoldVariant ? boldFont : fontFamily, fontWeight: hasBoldVariant ? 'normal' : ('700' as any), marginTop: 15, marginBottom: 8 },
    heading3: { color: isDark ? '#60a5fa' : '#2563eb', fontSize: 20, fontFamily: hasBoldVariant ? boldFont : fontFamily, fontWeight: hasBoldVariant ? 'normal' : ('600' as any), marginTop: 12, marginBottom: 6 },
    strong: { fontFamily: hasBoldVariant ? boldFont : fontFamily, fontWeight: hasBoldVariant ? 'normal' : ('700' as any), color: isDark ? '#ffffff' : '#0f172a' },
    em: { fontStyle: 'italic' as any, color: isDark ? '#a1a1aa' : '#4b5563', fontFamily },
    link: { color: isDark ? '#60a5fa' : '#2563eb', textDecorationLine: 'none' as any, fontWeight: 'bold' as any },
    list_item: { color: isDark ? '#cbd5e1' : '#334155', marginBottom: 5, fontFamily },
    blockquote: { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderLeftColor: '#3b82f6', borderLeftWidth: 4, paddingHorizontal: 15, paddingVertical: 10, marginVertical: 10, borderRadius: 8 },
    code_inline: { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', color: isDark ? '#fbbf24' : '#b45309', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontFamily: 'Monospace', fontSize: 16 },
    code_block: { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#94a3b8' : '#475569', padding: 15, borderRadius: 12, marginVertical: 10, fontFamily: 'Monospace', borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
    fence: { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#94a3b8' : '#475569', padding: 15, borderRadius: 12, marginVertical: 10, fontFamily: 'Monospace', borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
    table: { borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', borderRadius: 8 },
    tr: { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
    th: { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)', color: isDark ? '#ffffff' : '#0f172a', fontWeight: 'bold' as any, padding: 8, fontFamily: hasBoldVariant ? boldFont : fontFamily },
    td: { color: isDark ? '#cbd5e1' : '#334155', padding: 8, fontFamily },
    hr: { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', height: 1, marginVertical: 20 }
    };
};

// --- HELPERS ---



// --- COMPONENTS --- (Extracted to @/components/notes)
// AudioPlayer, VideoPlayer, DrawModal, NoteCard are now in components/notes/

// --- MAIN PAGE ---

export default function Notes() {
    const { width: windowWidth } = useWindowDimensions();
    const { t } = useTranslation();
    const [notes, setNotes] = useState<Note[]>([]);
    const [folders, setFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string>("all");
    const [search, setSearch] = useState("");

    // Premium Lock / Pin / Trash States
    const [pinCode, setPinCode] = useState<string>("");
    const [isPinCodeModalVisible, setIsPinCodeModalVisible] = useState(false);
    const [lockedNoteToUnlock, setLockedNoteToUnlock] = useState<Note | null>(null);
    const [lockedNoteToDelete, setLockedNoteToDelete] = useState<Note | null>(null);
    const [isChangePinModalVisible, setIsChangePinModalVisible] = useState(false);
    const [changePinOldInput, setChangePinOldInput] = useState("");
    const [changePinNewInput, setChangePinNewInput] = useState("");
    const [pinInput, setPinInput] = useState<string>("");
    const [isSettingPinCode, setIsSettingPinCode] = useState(false);

    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
    const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [showHighlighter, setShowHighlighter] = useState(false);
    const [laserMode, setLaserMode] = useState<'off' | 'dot' | 'trail_red' | 'trail_highlight'>('off');
    
    // --- Selection and Modals ---
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [editingFolderName, setEditingFolderName] = useState<string | null>(null); // null = create mode, string = rename mode
    const [folderActionSheet, setFolderActionSheet] = useState<string | null>(null); // folder name shown in action sheet
    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const [showDrawModal, setShowDrawModal] = useState(false);
    const [showAttachments, setShowAttachments] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showColorPrompt, setShowColorPrompt] = useState(false);
    const [colorPromptType, setColorPromptType] = useState<'note' | 'highlight'>('note');
    const [customColorInput, setCustomColorInput] = useState("#");
    const [pickerH, setPickerH] = useState(0);
    const [pickerS, setPickerS] = useState(100);
    const [pickerV, setPickerV] = useState(100);
    const [pickerSize, setPickerSize] = useState({ width: 300, height: 300 });

    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordDuration, setRecordDuration] = useState(0);
    const [recordMode, setRecordMode] = useState<'attachment' | 'inline'>('attachment');
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [showNoteTypeModal, setShowNoteTypeModal] = useState(false);
    const recordInterval = useRef<any>(null);

    const [detectedVerse, setDetectedVerse] = useState<{ book: string, chapter: string, verses: string, bookId?: number } | null>(null);
    const [verseContent, setVerseContent] = useState<string | null>(null);
    const [currentVerseBookId, setCurrentVerseBookId] = useState<number | null>(null);
    const [verseLoading, setVerseLoading] = useState(false);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
        onConfirm?: () => void;
    }>({ visible: false, title: '', message: '', type: 'info' });

    const [historyState, setHistoryState] = useState<{ stack: string[], index: number }>({ stack: [], index: -1 });
    const lastNoteIdRef = useRef<string | null>(null);
    const historyTimeoutRef = useRef<any>(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    useEffect(() => {
        const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
            setIsKeyboardVisible(true);
        });
        const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
            setIsKeyboardVisible(false);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    useEffect(() => {
        if (editingNote) {
            if (lastNoteIdRef.current !== editingNote.id) {
                lastNoteIdRef.current = editingNote.id;
                setHistoryState({
                    stack: [editingNote.content || ''],
                    index: 0
                });
            }
        } else {
            lastNoteIdRef.current = null;
            setHistoryState({ stack: [], index: -1 });
        }
    }, [editingNote?.id]);

    useEffect(() => {
        return () => {
            if (historyTimeoutRef.current) {
                clearTimeout(historyTimeoutRef.current);
            }
        };
    }, []);

    const pushHistoryState = (newContent: string, immediate: boolean = false) => {
        if (historyTimeoutRef.current) {
            clearTimeout(historyTimeoutRef.current);
            historyTimeoutRef.current = null;
        }

        const performPush = () => {
            setHistoryState(prev => {
                const { stack, index } = prev;
                if (index >= 0 && stack[index] === newContent) return prev;

                const sliced = stack.slice(0, index + 1);
                const nextStack = [...sliced, newContent];
                if (nextStack.length > 100) {
                    nextStack.shift();
                }
                return {
                    stack: nextStack,
                    index: nextStack.length - 1
                };
            });
        };

        if (immediate) {
            performPush();
        } else {
            historyTimeoutRef.current = setTimeout(() => {
                performPush();
            }, 800);
        }
    };

    const undo = () => {
        const { stack, index } = historyState;
        if (index > 0) {
            const prevContent = stack[index - 1];
            setHistoryState(prev => ({ ...prev, index: prev.index - 1 }));
            updateCurrentNoteState({ content: prevContent });
        }
    };

    const redo = () => {
        const { stack, index } = historyState;
        if (index < stack.length - 1) {
            const nextContent = stack[index + 1];
            setHistoryState(prev => ({ ...prev, index: prev.index + 1 }));
            updateCurrentNoteState({ content: nextContent });
        }
    };

    const textInputRef = useRef<TextInput>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const noteViewShotRef = useRef<any>(null);
    const { settings: globalSettings } = useSettings();

    const isDark = isColorDark(editingNote?.bgStyle?.color);
    const textColorClass = isDark ? "text-slate-200" : "text-slate-900";
    const placeholderColor = isDark ? "#475569" : "#a1a1aa";
    const activeFont = editingNote?.textStyle?.fontFamily || 'Lexend_400Regular';
    const dynamicMarkdownStyles = getMarkdownStyles(isDark, activeFont);

    const handlePrintNote = async () => {
        if (!editingNote) return;
        try {
            // 1. Process standard elements (verses, highlights, footnotes) via processContent
            let processed = processContent(editingNote.content);

            // 2. Parse inline media markdown
            processed = processed
                .replace(/\[image:\s*([^\]]+)\]/gi, (m, uri) => `<img src="${uri.trim()}" style="display: block; max-width: 100%; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);" />`)
                .replace(/\[video:\s*([^\]]+)\]/gi, (m, uri) => `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center; color: #64748b; font-size: 14px; margin: 15px 0; font-family: sans-serif;">🎥 Vidéo : ${uri.trim().split('/').pop()}</div>`)
                .replace(/\[audio:\s*([^\]]+)\]/gi, (m, uri) => `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 18px; color: #64748b; font-size: 14px; margin: 10px 0; font-family: sans-serif; display: flex; align-items: center; gap: 8px;">🎵 Audio : ${uri.trim().split('/').pop()}</div>`);

            // 3. Parse headers
            processed = processed
                .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
                .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
                .replace(/^# (.*?)$/gm, '<h1>$1</h1>');

            // 4. Custom Link elements (verses, highlights, footnotes)
            // Highlight: [content](#highlight:color)
            processed = processed.replace(/\[([^\]]+)\]\(#highlight:([^\)]+)\)/gi, (m, content, color) => `<mark style="background-color: ${color}; color: #1e293b; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${content}</mark>`);
            
            // Verse: [content](#verse:url)
            processed = processed.replace(/\[([^\]]+)\]\(#verse:([^\)]+)\)/gi, (m, content, url) => `<a href="#" style="color: #3b82f6; text-decoration: none; font-weight: 600; border-bottom: 1px dashed #3b82f6;">${content}</a>`);
            
            // Footnote ref: [ref](#footnote-ref:ref)
            processed = processed.replace(/\[([^\]]+)\]\(#footnote-ref:([^\)]+)\)/gi, (m, ref, val) => `<sup><a href="#footnote-def-${val}" style="color: #3b82f6; text-decoration: none; font-weight: bold; font-size: 10px; margin-left: 2px;">${ref}</a></sup>`);
            
            // Footnote def: [content](#footnote-def:ref)
            processed = processed.replace(/\[([^\]]+)\]\(#footnote-def:([^\)]+)\)/gi, (m, content, ref) => `<div id="footnote-def-${ref}" style="margin-top: 20px; padding-top: 10px; border-top: 1px dashed #e2e8f0; font-size: 12px; color: #64748b; font-style: italic;"><strong style="color: #3b82f6; margin-right: 4px;">${ref}.</strong>${content}</div>`);

            // 5. Parse checklists (⬜ checklist, ✅ ~~checklist~~)
            processed = processed
                .replace(/^⬜ (.*?)$/gm, '<li><input type="checkbox" disabled style="margin-right: 8px; transform: scale(1.1);"> $1</li>')
                .replace(/^✅ ~~(.*?)~~$/gim, '<li><input type="checkbox" checked disabled style="margin-right: 8px; transform: scale(1.1);"> <del style="color: #94a3b8;">$1</del></li>');

            // 6. Parse regular bullet lists (starts with - or *)
            processed = processed.replace(/^[-\*] (?!<input)(.*?)$/gm, '<li>$1</li>');

            // Group consecutive <li> items into <ul> lists
            processed = processed.replace(/((?:<li>.*?<\/li>\s*)+)/gs, '<ul style="padding-left: 20px; margin: 10px 0;">$1</ul>');

            // 7. Inline markup (Bold, Italic, Code)
            processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');
            processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
            processed = processed.replace(/_(.*?)_/g, '<em>$1</em>');
            processed = processed.replace(/`(.*?)`/g, '<code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 14px;">$1</code>');

            // 8. Paragraph formatting for plain text blocks
            const lines = processed.split('\n');
            const htmlLines = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) return '';
                if (trimmed.startsWith('<h') || 
                    trimmed.startsWith('</h') || 
                    trimmed.startsWith('<ul') || 
                    trimmed.startsWith('</ul') || 
                    trimmed.startsWith('<li') || 
                    trimmed.startsWith('<div') || 
                    trimmed.startsWith('</div') || 
                    trimmed.startsWith('<img') || 
                    trimmed.startsWith('<blockquote') ||
                    trimmed.startsWith('</blockquote')) {
                    return line;
                }
                return `<p style="margin: 10px 0; font-size: 16px; line-height: 1.6; color: #334155;">${line}</p>`;
            });
            const htmlContent = htmlLines.filter(Boolean).join('\n');

            // Find other attachments that were not printed inline
            const printedImages = new Set<string>();
            const inlineImageMatches = [...editingNote.content.matchAll(/\[image:\s*([^\]]+)\]/gi)];
            inlineImageMatches.forEach(m => printedImages.add(m[1].trim()));

            const otherImagesHtml = editingNote.attachments?.images
                ?.filter(img => !printedImages.has(img.trim()))
                ?.map(img => `<img src="${img}" style="display: block; max-width: 100%; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);" />`)
                ?.join('') || '';

            const template = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            body {
                                font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                padding: 50px;
                                color: #1e293b;
                                background: white;
                                max-width: 800px;
                                margin: 0 auto;
                            }
                            h1 {
                                font-size: 28px;
                                color: #0f172a;
                                margin-top: 0;
                                margin-bottom: 8px;
                                font-weight: 700;
                            }
                            h2 {
                                font-size: 20px;
                                color: #1e293b;
                                margin-top: 25px;
                                margin-bottom: 12px;
                                border-bottom: 1px solid #f1f5f9;
                                padding-bottom: 6px;
                            }
                            h3 {
                                font-size: 17px;
                                color: #334155;
                                margin-top: 20px;
                                margin-bottom: 8px;
                            }
                            .date {
                                color: #94a3b8;
                                font-size: 13px;
                                margin-bottom: 30px;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                            }
                            .content {
                                font-size: 16px;
                                line-height: 1.7;
                                color: #334155;
                            }
                            p {
                                margin: 0 0 16px 0;
                            }
                            ul {
                                padding-left: 24px;
                                margin-bottom: 16px;
                            }
                            li {
                                margin-bottom: 6px;
                            }
                            blockquote {
                                border-left: 4px solid #cbd5e1;
                                padding-left: 16px;
                                margin: 20px 0;
                                color: #64748b;
                                font-style: italic;
                            }
                            img {
                                max-width: 100%;
                                border-radius: 16px;
                                margin-top: 20px;
                                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
                            }
                        </style>
                    </head>
                    <body>
                        <h1>${editingNote.title || 'Note sans titre'}</h1>
                        <div class="date">${new Date(editingNote.date).toLocaleString('fr-FR')}</div>
                        <div class="content">${htmlContent}</div>
                        ${otherImagesHtml}
                    </body>
                </html>
            `;
            await Print.printAsync({ html: template });
        } catch (e) {
            console.error("Failed to print PDF", e);
            setAlertConfig({ visible: true, title: "Erreur", message: "Impossible de créer le PDF de la note.", type: 'error' });
        }
    };


    const handleShareNoteImage = async () => {
        if (noteViewShotRef.current) {
            try {
                const uri = await noteViewShotRef.current.capture();
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'image/jpeg',
                        dialogTitle: editingNote?.title || 'Partager ma note',
                    });
                } else {
                    setAlertConfig({ visible: true, title: "Partage indisponible", message: "Le partage n'est pas disponible sur votre appareil.", type: 'error' });
                }
            } catch (e) {
                console.error("Failed to capture and share note", e);
                setAlertConfig({ visible: true, title: "Erreur", message: "Impossible de générer l'image de la note.", type: 'error' });
            }
        }
    };

    // --- CORE LOGIC ---

    const { id: noteIdParam, action } = useLocalSearchParams();

    useFocusEffect(
        useCallback(() => {
            loadInitialData();
        }, [])
    );

    useEffect(() => {
        if (noteIdParam && notes.length > 0) {
            const note = notes.find(n => n.id === noteIdParam);
            if (note) {
                setEditingNote(note);
                setIsPreviewMode(true);
            }
        }
    }, [noteIdParam, notes]);

    useEffect(() => {
        if (action === 'new') {
            // Automatically open a new text note when requested by the Quick Action
            handleCreateNote('text');
            // Clear the param to prevent re-triggering if the component re-renders
            router.setParams({ action: undefined });
        }
    }, [action]);

    useEffect(() => {
        const backAction = () => {
            if (editingNote) {
                closeNote();
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [editingNote]);

    const closeNote = async () => {
        if (editingNote) {
            await handleSaveNote();
            setEditingNote(null);
            router.setParams({ id: undefined });
        }
    };

    const loadInitialData = async () => {
        try {
            const [savedNotes, savedFolders] = await Promise.all([
                getAllNotes(),
                getFolders()
            ]);
            
            // Load custom bg styles for each note in parallel
            const notesWithBg = await Promise.all(savedNotes.map(async (n) => {
                const styleStr = await AsyncStorage.getItem(`@note_bg_style_${n.id}`);
                const bgStyle = styleStr ? JSON.parse(styleStr) : undefined;
                const textStyleStr = await AsyncStorage.getItem(`@note_text_style_${n.id}`);
                const textStyle = textStyleStr ? JSON.parse(textStyleStr) : undefined;
                return { ...n, bgStyle, textStyle };
            }));

            setNotes(notesWithBg);
            setFolders(savedFolders);
            const savedPin = await AsyncStorage.getItem('adventools_note_lock_pin');
            if (savedPin) setPinCode(savedPin);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (detectedVerse) {
            setVerseLoading(true);
            // On active le stripNotes (5ème argument à true)
            fetchVerseContent(globalSettings.bibleVersion, detectedVerse.book, String(detectedVerse.chapter), detectedVerse.verses, true)
                .then(res => {
                    if (res && res.text) {
                        setVerseContent(res.text);
                        if (res.bookId) setCurrentVerseBookId(res.bookId);
                    } else {
                        setVerseContent(t('verse_not_found') || "Verset non trouvé");
                    }
                })
                .catch(e => {
                    console.error(e);
                    setVerseContent("Erreur de chargement du verset");
                })
                .finally(() => setVerseLoading(false));
        } else {
            setCurrentVerseBookId(null);
            setVerseContent(null);
        }
    }, [detectedVerse?.book, detectedVerse?.chapter, detectedVerse?.verses]);

    const saveAllNotes = async (updatedNotes: Note[]) => {
        try {
            setNotes(updatedNotes);
        } catch (e) { console.error(e); }
    };

    const updateCurrentNoteState = (partialNote: Partial<Note>) => {
        setEditingNote(prev => prev ? ({ ...prev, ...partialNote }) : null);
    };

    const handleSaveNote = async () => {
        if (!editingNote) return;

        // Discard if empty (no title, no content, no attachments)
        const isEmpty = !editingNote.title.trim() && 
                        (!editingNote.content.trim() || NOTE_TEMPLATES.some(t => t.content === editingNote.content)) && 
                        (!editingNote.attachments?.images?.length) && 
                        (!editingNote.attachments?.videos?.length) && 
                        (!editingNote.attachments?.voice?.length);
        
        if (isEmpty) {
            await deleteNoteFromDb(editingNote.id);
            await AsyncStorage.removeItem(`@note_bg_style_${editingNote.id}`);
            await AsyncStorage.removeItem(`@note_text_style_${editingNote.id}`);
            setNotes(notes.filter(n => n.id !== editingNote.id));
            return;
        }

        await saveNote(editingNote);
        if (editingNote.bgStyle) {
            await AsyncStorage.setItem(`@note_bg_style_${editingNote.id}`, JSON.stringify(editingNote.bgStyle));
        }
        if (editingNote.textStyle) {
            await AsyncStorage.setItem(`@note_text_style_${editingNote.id}`, JSON.stringify(editingNote.textStyle));
        } else {
            await AsyncStorage.removeItem(`@note_text_style_${editingNote.id}`);
        }
        
        const exists = notes.find(n => n.id === editingNote.id);
        const updated = exists ? notes.map(n => n.id === editingNote.id ? editingNote : n) : [editingNote, ...notes];
        setNotes(updated);
    };

    const addToHistory = async (note: Note) => {
        try {
            await saveHistory({
                type: 'note',
                title: note.title || t('untitled_note'),
                subtitle: `Note • ${new Date(note.date).toLocaleDateString("fr-FR")}`,
                timestamp: Date.now(),
                params: { id: note.id }
            });
        } catch (e) {
            console.error("Failed to add note to history", e);
        }
    };


    const handleToggleLock = async () => {
        if (!editingNote) return;
        
        if (editingNote.isLocked) {
            updateCurrentNoteState({ isLocked: false });
            setAlertConfig({ visible: true, title: "Note déverrouillée", message: "Cette note n'est plus chiffrée.", type: 'success' });
        } else {
            if (!pinCode) {
                setIsSettingPinCode(true);
                setPinInput("");
                setIsPinCodeModalVisible(true);
            } else {
                updateCurrentNoteState({ isLocked: true });
                setAlertConfig({ visible: true, title: "Note verrouillée", message: "Cette note est désormais chiffrée. Elle n'affichera aucun aperçu dans le journal principal.", type: 'success' });
            }
        }
    };

    const toggleSelectNote = (id: string) => {
        setSelectedNoteIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleNoteLongPress = (n: Note) => {
        setIsMultiSelectActive(true);
        setSelectedNoteIds([n.id]);
    };

    const handleRestoreSelected = async () => {
        if (selectedNoteIds.length === 0) return;
        const updatedNotes = notes.map(n => {
            if (!selectedNoteIds.includes(n.id)) return n;
            const u = { ...n, isTrash: false, deletedAt: undefined };
            saveNote(u);
            return u;
        });
        setNotes(updatedNotes);
        setIsMultiSelectActive(false);
        setSelectedNoteIds([]);
        setAlertConfig({ visible: true, title: "Notes restaurées", message: `${selectedNoteIds.length} note(s) réintégrée(s).`, type: 'success' });
    };

    const handleDeleteSelected = async () => {
        if (selectedNoteIds.length === 0) return;
        const inTrash = selectedFolder === 'trash';
        const idsSnap = [...selectedNoteIds];
        const doDelete = async () => {
            if (inTrash) {
                for (const id of idsSnap) {
                    await deleteNoteFromDb(id);
                    await AsyncStorage.removeItem(`@note_bg_style_${id}`);
                    await AsyncStorage.removeItem(`@note_text_style_${id}`);
                }
                setNotes(prev => prev.filter(n => !idsSnap.includes(n.id)));
            } else {
                const updated = notes.map(n => {
                    if (!idsSnap.includes(n.id)) return n;
                    const u = { ...n, isTrash: true, deletedAt: Date.now() };
                    saveNote(u);
                    return u;
                });
                setNotes(updated);
            }
            setIsMultiSelectActive(false);
            setSelectedNoteIds([]);
        };
        setAlertConfig({
            visible: true,
            title: inTrash ? `Supprimer ${idsSnap.length} note(s) ?` : `Déplacer ${idsSnap.length} note(s) ?`,
            message: inTrash ? 'Ces notes seront supprimées définitivement.' : 'Ces notes seront déplacées dans la corbeille.',
            type: 'error',
            onConfirm: doDelete
        });
    };

    const handleEmptyTrash = () => {
        const trashNotes = notes.filter(n => n.isTrash);
        if (trashNotes.length === 0) return;
        const hasLocked = trashNotes.some(n => n.isLocked);
        const doEmpty = async () => {
            for (const note of trashNotes) {
                await deleteNoteFromDb(note.id);
                await AsyncStorage.removeItem(`@note_bg_style_${note.id}`);
                await AsyncStorage.removeItem(`@note_text_style_${note.id}`);
            }
            setNotes(prev => prev.filter(n => !n.isTrash));
        };
        if (hasLocked && pinCode) {
            setAlertConfig({
                visible: true, title: 'PIN requis',
                message: 'La corbeille contient des notes verrouillées. Entrez votre PIN pour confirmer.',
                type: 'error',
                onConfirm: () => {
                    setLockedNoteToDelete({ id: '__empty_trash__' } as any);
                    setPinInput('');
                    setIsPinCodeModalVisible(true);
                }
            });
        } else {
            setAlertConfig({
                visible: true, title: 'Vider la corbeille ?',
                message: 'Toutes les notes de la corbeille seront définitivement supprimées.',
                type: 'error', onConfirm: doEmpty
            });
        }
    };

        const handleSubmitPin = async () => {
        if (pinInput.length < 4) {
            setAlertConfig({ visible: true, title: "Code trop court", message: "Le code PIN doit comporter au moins 4 chiffres.", type: 'error' });
            return;
        }

        if (isSettingPinCode) {
            setPinCode(pinInput);
            await AsyncStorage.setItem('adventools_note_lock_pin', pinInput);
            setIsSettingPinCode(false);
            setIsPinCodeModalVisible(false);
            updateCurrentNoteState({ isLocked: true });
            setAlertConfig({ visible: true, title: "Code PIN configuré", message: "Votre code PIN a été enregistré avec succès et la note a été verrouillée.", type: 'success' });
        } else if (lockedNoteToUnlock) {
            if (pinInput === pinCode) {
                const note = lockedNoteToUnlock;
                setLockedNoteToUnlock(null);
                setIsPinCodeModalVisible(false);
                setEditingNote(note);
                setIsPreviewMode(true);
                addToHistory(note);
            } else {
                setAlertConfig({ visible: true, title: "Code PIN incorrect", message: "Le code saisi est invalide.", type: 'error' });
                setPinInput("");
            }
        } else if (lockedNoteToDelete) {
            if (pinInput === pinCode) {
                const target = lockedNoteToDelete;
                setLockedNoteToDelete(null);
                setIsPinCodeModalVisible(false);
                if ((target as any).id === '__empty_trash__') {
                    const trashNotes = notes.filter(n => n.isTrash);
                    for (const note of trashNotes) {
                        await deleteNoteFromDb(note.id);
                        await AsyncStorage.removeItem(`@note_bg_style_${note.id}`);
                        await AsyncStorage.removeItem(`@note_text_style_${note.id}`);
                    }
                    setNotes(prev => prev.filter(n => !n.isTrash));
                    setAlertConfig({ visible: true, title: "Corbeille vidée", message: "Toutes les notes ont été purgées.", type: 'success' });
                } else {
                    performDeleteNote(target);
                }
            } else {
                setAlertConfig({ visible: true, title: "Code PIN incorrect", message: "Le code saisi est invalide.", type: 'error' });
                setPinInput("");
            }
        }
    };

    const restoreNote = async (note: Note) => {
        const updated = { ...note, isTrash: false, deletedAt: undefined };
        await saveNote(updated);
        setNotes(notes.map(n => n.id === note.id ? updated : n));
        setAlertConfig({ visible: true, title: "Note restaurée", message: "Votre note a été réintégrée dans votre journal principal.", type: 'success' });
    };

    const handleNoteClick = (n: Note) => {
        if (isMultiSelectActive) {
            toggleSelectNote(n.id);
            return;
        }
        if (selectedFolder === 'trash') {
            setAlertConfig({
                visible: true,
                title: "Restaurer la note",
                message: "Voulez-vous restaurer cette réflexion dans votre journal principal ?",
                type: 'info',
                onConfirm: () => restoreNote(n)
            });
            return;
        }

        if (n.isLocked) {
            setLockedNoteToUnlock(n);
            setPinInput("");
            setIsPinCodeModalVisible(true);
        } else {
            setEditingNote(n);
            setIsPreviewMode(true);
            addToHistory(n);
        }
    };

    const performDeleteNote = (note: Note) => {
        const id = note.id;
        if (note.isTrash || selectedFolder === 'trash') {
            setAlertConfig({
                visible: true,
                title: "Supprimer définitivement",
                message: "Voulez-vous supprimer définitivement cette réflexion ? Les fichiers joints seront également purgés.",
                type: 'error',
                onConfirm: async () => {
                    await deleteNoteFromDb(id);
                    await AsyncStorage.removeItem(`@note_bg_style_${id}`);
                    await AsyncStorage.removeItem(`@note_text_style_${id}`);
                    setNotes(notes.filter(n => n.id !== id));
                }
            });
        } else {
            setAlertConfig({
                visible: true,
                title: "Déplacer dans la corbeille",
                message: "Cette note sera déplacée dans la corbeille. Vous pourrez la restaurer à tout moment.",
                type: 'info',
                onConfirm: async () => {
                    const updated = { ...note, isTrash: true, deletedAt: Date.now() };
                    await saveNote(updated);
                    setNotes(notes.map(n => n.id === id ? updated : n));
                }
            });
        }
    };

    const deleteNote = (id: string) => {
        const note = notes.find(n => n.id === id);
        if (!note) return;

        if (note.isLocked && pinCode) {
            setLockedNoteToDelete(note);
            setPinInput("");
            setIsPinCodeModalVisible(true);
            return;
        }

        performDeleteNote(note);
    };

    const addNote = () => {
        setShowNoteTypeModal(true);
    };

    const handleCreateNote = (type: 'text' | 'draw', template?: any) => {
        const n: Note = { 
            id: Date.now().toString(), 
            type, 
            title: template?.title || "", 
            content: template?.content || "", 
            date: Date.now(), 
            color: template?.color,
            folder: selectedFolder !== 'all' ? selectedFolder : undefined 
        };
        setEditingNote(n); 
        setIsPreviewMode(type === 'draw');
        setShowNoteTypeModal(false);
        if (type === 'draw') setShowDrawModal(true);
    };

    const pickAndInsertMedia = async (type: 'image' | 'video' | 'audio') => {
        try {
            let options: any = {
                mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: type === 'image',
                quality: 0.8,
            };

            const r = await ImagePicker.launchImageLibraryAsync(options);

            if (!r.canceled && editingNote) {
                const asset = r.assets[0];
                const permanentUri = await saveFilePermanently(asset.uri, type === 'audio' ? 'voice' : (type === 'video' ? 'video' : 'image'));
                
                const tag = `[${type}: ${permanentUri}]`;
                insertMarkdown(tag, '');
            }
        } catch (e) {
            console.error(e);
            setAlertConfig({
              visible: true,
              title: "Erreur",
              message: "Impossible d'insérer le média.",
              type: 'error'
            });
        }
    };

    const pickMedia = async (useCamera: boolean = false, mediaType: 'Images' | 'Videos' | 'All' = 'All') => {
        try {
            const { status } = useCamera
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                setAlertConfig({ visible: true, title: "Permission refusée", message: "L'accès à la caméra ou à la galerie est nécessaire.", type: 'error' });
                return;
            }

            const options = {
                mediaTypes: ImagePicker.MediaTypeOptions[mediaType],
                allowsEditing: mediaType === 'Images', 
                quality: 0.8,
                videoMaxDuration: 120,
            };

            const r = useCamera
                ? await ImagePicker.launchCameraAsync(options)
                : await ImagePicker.launchImageLibraryAsync(options);

            if (!r.canceled && editingNote) {
                const asset = r.assets[0];
                const isVid = asset.type === 'video';
                const permanentUri = await saveFilePermanently(asset.uri, isVid ? 'video' : 'image');

                const updatedAttachments = { ...editingNote.attachments };
                if (isVid) {
                    updatedAttachments.videos = [...(updatedAttachments.videos || []), permanentUri];
                } else {
                    updatedAttachments.images = [...(updatedAttachments.images || []), permanentUri];
                }

                const updatedNote = { ...editingNote, attachments: updatedAttachments };
                setEditingNote(updatedNote);

                const updatedNotesList = notes.map(n => n.id === updatedNote.id ? updatedNote : n);
                await saveAllNotes(updatedNotesList.find(n => n.id === updatedNote.id) ? updatedNotesList : [updatedNote, ...notes]);
            }
        } catch (e) {
            console.error(e);
            setAlertConfig({ visible: true, title: "Erreur", message: "Impossible d'accéder aux médias.", type: 'error' });
        }
    };

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                setAlertConfig({ visible: true, title: "Microphone bloqué", message: "L'autorisation du micro est nécessaire pour enregistrer.", type: 'error' });
                return;
            }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            if (recording) { try { await recording.stopAndUnloadAsync(); } catch (e) { } }
            const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(newRecording);
            setIsRecording(true);
            setRecordDuration(0);
            if (recordInterval.current) clearInterval(recordInterval.current);
            recordInterval.current = setInterval(() => setRecordDuration(prev => prev + 1), 1000);
        } catch (err) {
            console.error("Start Recording error:", err);
            setIsRecording(false);
            setRecording(null);
        }
    };

    const stopRecording = async (save: boolean = true) => {
        if (!recording) return;
        try {
            if (recordInterval.current) clearInterval(recordInterval.current);
            setIsRecording(false);
            await (recording as Audio.Recording).stopAndUnloadAsync();
            const uri = (recording as Audio.Recording).getURI();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
            if (save && uri && editingNote) {
                const pUri = await saveFilePermanently(uri, 'voice');
                if (recordMode === 'inline') {
                    insertMarkdown(`[audio: ${pUri}]`, '');
                } else {
                    const updatedAttachments = { ...editingNote.attachments, voice: [...(editingNote.attachments?.voice || []), { uri: pUri, duration: recordDuration }] };
                    const updatedNote = { ...editingNote, attachments: updatedAttachments };
                    setEditingNote(updatedNote);
                    const updatedNotesList = notes.map(n => n.id === updatedNote.id ? updatedNote : n);
                    await saveAllNotes(updatedNotesList.find(n => n.id === updatedNote.id) ? updatedNotesList : [updatedNote, ...notes]);
                }
            }
        } catch (e) { console.error("Stop Recording Error", e); } finally {
            setRecording(null); setRecordDuration(0); setShowVoiceModal(false); setRecordMode('attachment');
        }
    };

    const insertMarkdown = (before: string, after: string = '') => {
        if (!editingNote) return;
        const { start, end } = selection;
        const prev = editingNote.content;
        const newContent = prev.substring(0, start) + before + prev.substring(start, end) + after + prev.substring(end);
        updateCurrentNoteState({ content: newContent });
        pushHistoryState(newContent, true);
        setTimeout(() => textInputRef.current?.focus(), 100);
    };

    const processContent = (text: string) => {
        if (!text) return "";
        let output = "";
        let lastIndex = 0;
        
        // Reset BIBLE_REGEX index
        BIBLE_REGEX.lastIndex = 0;
        let match;
        
        while ((match = BIBLE_REGEX.exec(text)) !== null) {
            const matchIndex = match.index;
            
            // Append everything between last match and current match
            output += text.substring(lastIndex, matchIndex);
            
            let matchedText = match[0];
            let book = match[1];
            let chapter = match[2];
            let verses = match[3] || "";
            
            let currentEnd = BIBLE_REGEX.lastIndex;
            
            // Look ahead for sequential suffixes (e.g. "; 14:12,16" or "; 8:2,3")
            const suffixRegex = /^\s*;\s*(\d+\s*:\s*[\d\s\-,]+|\d+\s*:\s*\d+|\d+\s*-\s*\d+|\d+)/;
            let suffixMatch;
            
            let combinedVerses = verses;
            
            while ((suffixMatch = suffixRegex.exec(text.substring(currentEnd))) !== null) {
                const consumedSuffix = suffixMatch[0];
                matchedText += consumedSuffix;
                combinedVerses += ";" + suffixMatch[1].trim().replace(/\s+/g, '');
                currentEnd += consumedSuffix.length;
            }
            
            // Generate link
            output += `[${matchedText}](#verse:${encodeURIComponent(book.trim())}/${chapter}/${encodeURIComponent(combinedVerses)})`;
            
            // Advance lastIndex and update regex lastIndex to skip consumed suffix
            lastIndex = currentEnd;
            BIBLE_REGEX.lastIndex = currentEnd;
        }
        
        output += text.substring(lastIndex);
        
        // Checkboxes replacement
        output = output.replace(/-\s*\[\s*\]\s*(.*)/g, '⬜ $1');
        output = output.replace(/-\s*\[x\]\s*(.*)/gi, '✅ ~~$1~~');
        
        // Footnotes, mark highlights, etc.
        output = output.replace(/\[\^(\d+)\](?!\:)/g, (match, ref) => `[${ref}](#footnote-ref:${ref})`);
        output = output.replace(/^\[\^(\d+)\]:\s*(.*)$/gm, (match, ref, text) => `[${text}](#footnote-def:${ref})`);
        output = output.replace(/<mark style="background-color:\s*(#[a-fA-F0-9]+)">([\s\S]*?)<\/mark>/gi, (match, color, content) => `[${content}](#highlight:${color})`);
        
        return output;
    };

    const renderNoteContent = (text: string) => {
        if (!text) return <Text className="text-white/20 italic">{t('no_content')}</Text>;
        const parts = text.split(/(\[(?:image|video|audio):\s*[^\]]+\])/gi);
        return parts.map((part, index) => {
            const imageMatch = part.match(/\[image:\s*([^\]]+)\]/i);
            const videoMatch = part.match(/\[video:\s*([^\]]+)\]/i);
            const audioMatch = part.match(/\[audio:\s*([^\]]+)\]/i);
            if (imageMatch) {
                const uri = imageMatch[1].trim();
                return (
                    <TouchableOpacity key={index} onPress={() => setSelectedImage(uri)} className="my-4">
                        <RNImage source={{ uri }} style={{ width: '100%', height: 220, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)' }} resizeMode="cover" />
                    </TouchableOpacity>
                );
            }
            if (videoMatch) return <View key={index} className="my-4"><VideoPlayer uri={videoMatch[1].trim()} /></View>;
            if (audioMatch) return <View key={index} className="my-2"><AudioPlayer uri={audioMatch[1].trim()} /></View>;
            return (
                <Markdown
                    key={index}
                    style={{
                        ...dynamicMarkdownStyles,
                        body: {
                            ...((dynamicMarkdownStyles as any).body || {}),
                            fontFamily: activeFont,
                            fontSize: editingNote?.textStyle?.fontSize || 18,
                            textAlign: editingNote?.textStyle?.textAlign || 'left',
                        },
                        paragraph: {
                            textAlign: editingNote?.textStyle?.textAlign || 'left',
                        },
                        heading1: {
                            ...((dynamicMarkdownStyles as any).heading1 || {}),
                            textAlign: editingNote?.textStyle?.textAlign || 'left',
                        },
                        heading2: {
                            ...((dynamicMarkdownStyles as any).heading2 || {}),
                            textAlign: editingNote?.textStyle?.textAlign || 'left',
                        },
                        heading3: {
                            ...((dynamicMarkdownStyles as any).heading3 || {}),
                            textAlign: editingNote?.textStyle?.textAlign || 'left',
                        },
                    } as any}
                    onLinkPress={handleVerseClick}
                    rules={{
                        // Override italic to avoid Android system font fallback
                        em: (node, children, parent, styles) => (
                            <Text key={node.key} style={{
                                fontFamily: activeFont,
                                fontSize: editingNote?.textStyle?.fontSize || 18,
                                color: isDark ? '#94a3b8' : '#64748b',
                                letterSpacing: 0.4,
                                opacity: 0.85,
                            }}>{children}</Text>
                        ),
                        link: (node, children, parent, styles) => {
                            const url = node.attributes.href;
                            if (url.startsWith('#highlight:')) {
                                const color = url.replace('#highlight:', '');
                                return <Text key={node.key} style={{ backgroundColor: color, color: '#000', borderRadius: 4, paddingHorizontal: 2, fontSize: 18 }}>{children}</Text>;
                            }
                            if (url.startsWith('#footnote-ref:')) {
                                const ref = url.replace('#footnote-ref:', '');
                                return <Text key={node.key} style={{ fontSize: 12, color: '#3b82f6', verticalAlign: 'top', fontWeight: 'bold' }}> {ref}</Text>;
                            }
                            if (url.startsWith('#footnote-def:')) {
                                const ref = url.replace('#footnote-def:', '');
                                return (
                                    <View key={node.key} className="flex-row mt-4 pt-4 border-t border-white/5">
                                        <Text className="text-primary font-bold mr-2 text-xs">{ref}.</Text>
                                        <Text className="text-white/40 text-xs flex-1 italic">{children}</Text>
                                    </View>
                                );
                            }
                            return <Text key={node.key} style={styles.link} onPress={() => handleVerseClick(url)}>{children}</Text>;
                        },
                        image: () => null
                    }}
                >
                    {processContent(part)}
                </Markdown>
            );
        });
    };

    const handleVerseClick = (url: string) => {
        if (url.startsWith('#verse:')) {
            const parts = url.replace('#verse:', '').split('/');
            setDetectedVerse({ book: decodeURIComponent(parts[0]), chapter: parts[1], verses: decodeURIComponent(parts[2] || "") });
            return false;
        }
        if (url.startsWith('#highlight:') || url.startsWith('#inline-') || url.startsWith('#footnote-')) return false;
        return true;
    };

    const filteredNotes = notes.filter(n => {
        const m = (n.title + n.content).toLowerCase().includes(search.toLowerCase());
        if (selectedFolder === 'trash') {
            return m && !!n.isTrash;
        }
        if (n.isTrash) return false;
        return selectedFolder === 'all' ? m : m && n.folder === selectedFolder;
    }).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.date - a.date;
    });

    // markdownStyles has been made dynamic (dynamicMarkdownStyles)

    return (
        <SafeAreaView className="flex-1 bg-[#020617]">
            <StatusBar style="light" />

            <View className="px-6 pt-6">
                {/* Title row */}
                <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-1">
                        <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[4px] mb-1">{t('study_journal')}</Text>
                        <Text className="text-4xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>{t('my_journal')}</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity onPress={() => { setChangePinOldInput(""); setChangePinNewInput(""); setIsChangePinModalVisible(true); }} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 items-center justify-center">
                            <Lock size={18} color={pinCode ? "#f59e0b" : "#8b949e"} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSearch(prev => { if (prev === '__SEARCH__') return ''; return '__SEARCH__'; })} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 items-center justify-center">
                            <Search size={20} color="#8b949e" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={addNote} className="w-14 h-14 rounded-[22px] bg-primary items-center justify-center shadow-2xl shadow-primary/40 border border-white/20">
                            <Plus size={28} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Collapsible search bar */}
                {search === '__SEARCH__' || (search !== '__SEARCH__' && search.length > 0) ? (
                    <View className="flex-row items-center bg-white/5 border border-white/10 rounded-[28px] px-6 h-14 mb-4">
                        <Search size={18} color="#475569" />
                        <TextInput
                            placeholder={t('search_note_placeholder')}
                            placeholderTextColor="#475569"
                            className="flex-1 ml-4 text-white text-base"
                            value={search === '__SEARCH__' ? '' : search}
                            onChangeText={v => setSearch(v || '__SEARCH__')}
                            autoFocus
                        />
                        <TouchableOpacity onPress={() => setSearch('')}><X size={18} color="#475569" /></TouchableOpacity>
                    </View>
                ) : null}

                {/* Stats row — compact inline */}
                {(() => {
                    const activeNotes = notes.filter(n => !n.isTrash);
                    if (activeNotes.length === 0) return null;
                    const totalWords = activeNotes.reduce((acc, n) => acc + (n.content ? n.content.trim().split(/\s+/).filter(Boolean).length : 0), 0);
                    const pinnedCount = activeNotes.filter(n => n.isPinned).length;
                    const lockedCount = activeNotes.filter(n => n.isLocked).length;
                    const thisWeek = activeNotes.filter(n => Date.now() - n.date < 7 * 24 * 60 * 60 * 1000).length;
                    return (
                        <View className="flex-row bg-white/5 border border-white/8 rounded-3xl px-4 py-3 mb-5 items-center">
                            <View className="flex-1 items-center">
                                <Text className="text-white font-bold text-lg" style={{ fontFamily: 'Lexend_700Bold' }}>{activeNotes.length}</Text>
                                <Text className="text-white/30 text-[9px] font-bold uppercase tracking-wider">Notes</Text>
                            </View>
                            <View className="w-[1px] h-8 bg-white/10" />
                            <View className="flex-1 items-center">
                                <Text className="text-blue-400 font-bold text-lg" style={{ fontFamily: 'Lexend_700Bold' }}>{totalWords >= 1000 ? `${(totalWords/1000).toFixed(1)}k` : totalWords}</Text>
                                <Text className="text-white/30 text-[9px] font-bold uppercase tracking-wider">Mots</Text>
                            </View>
                            <View className="w-[1px] h-8 bg-white/10" />
                            <View className="flex-1 items-center">
                                <Text className="text-yellow-400 font-bold text-lg" style={{ fontFamily: 'Lexend_700Bold' }}>{pinnedCount}</Text>
                                <Text className="text-white/30 text-[9px] font-bold uppercase tracking-wider">Pin</Text>
                            </View>
                            <View className="w-[1px] h-8 bg-white/10" />
                            <View className="flex-1 items-center">
                                <Text className="text-purple-400 font-bold text-lg" style={{ fontFamily: 'Lexend_700Bold' }}>{lockedCount}</Text>
                                <Text className="text-white/30 text-[9px] font-bold uppercase tracking-wider">Sécurité</Text>
                            </View>
                            <View className="w-[1px] h-8 bg-white/10" />
                            <View className="flex-1 items-center">
                                <Text className="text-green-400 font-bold text-lg" style={{ fontFamily: 'Lexend_700Bold' }}>{thisWeek}</Text>
                                <Text className="text-white/30 text-[9px] font-bold uppercase tracking-wider">Semaine</Text>
                            </View>
                        </View>
                    );
                })()}

                {/* Folder tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
                    <TouchableOpacity onPress={() => setSelectedFolder("all")} className={cn("px-6 py-4 rounded-3xl mr-3 border", selectedFolder === "all" ? "bg-primary border-primary" : "bg-white/5 border-white/10")}>
                        <Text className={cn("font-bold text-sm", selectedFolder === "all" ? "text-white" : "text-slate-400")}>{t('all_notes')}</Text>
                    </TouchableOpacity>
                    {folders.map(f => (
                        <TouchableOpacity
                          key={f}
                          onPress={() => setSelectedFolder(f)}
                          onLongPress={() => setFolderActionSheet(f)}
                          className={cn("px-6 py-4 rounded-3xl mr-3 border", selectedFolder === f ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10")}
                        >
                            <Text className={cn("font-bold text-sm", selectedFolder === f ? "text-primary" : "text-slate-500")}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={() => setSelectedFolder("trash")} className={cn("px-6 py-4 rounded-3xl mr-3 border flex-row items-center", selectedFolder === "trash" ? "bg-red-500/20 border-red-500" : "bg-white/5 border-white/10")}>
                        <Trash2 size={14} color={selectedFolder === "trash" ? "#ef4444" : "#64748b"} className="mr-2" />
                        <Text className={cn("font-bold text-sm", selectedFolder === "trash" ? "text-red-400" : "text-slate-400")}>Corbeille</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEditingFolderName(null); setNewFolderName(""); setShowFolderModal(true); }} className="w-14 h-14 rounded-[22px] bg-white/5 border border-dashed border-white/20 items-center justify-center"><Plus size={20} color="#94a3b8" /></TouchableOpacity>
                </ScrollView>
            </View>

            {/* Multi-select action bar */}
            {isMultiSelectActive && (
                <View className="mx-4 mb-3 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-3xl flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => { setIsMultiSelectActive(false); setSelectedNoteIds([]); }} className="flex-row items-center">
                        <X size={16} color="#60a5fa" />
                        <Text className="text-blue-400 font-bold text-sm ml-1.5">{selectedNoteIds.length} sélectionnée(s)</Text>
                    </TouchableOpacity>
                    <View className="flex-row gap-3">
                        {selectedFolder === 'trash' && (
                            <TouchableOpacity onPress={handleRestoreSelected} className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-2xl">
                                <Text className="text-green-400 font-bold text-xs">Restaurer</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={handleDeleteSelected} className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-2xl">
                            <Text className="text-red-400 font-bold text-xs">{selectedFolder === 'trash' ? 'Purger' : 'Supprimer'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Empty Trash button */}
            {selectedFolder === 'trash' && !isMultiSelectActive && notes.filter(n => n.isTrash).length > 0 && (
                <TouchableOpacity onPress={handleEmptyTrash} className="mx-4 mb-3 px-5 py-3 bg-red-500/10 border border-red-500/20 rounded-3xl flex-row items-center justify-center">
                    <Trash2 size={14} color="#ef4444" />
                    <Text className="text-red-400 font-bold text-sm ml-2">Vider la corbeille</Text>
                </TouchableOpacity>
            )}

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {filteredNotes.length > 0 ? (
                    <View className="flex-row gap-4">
                        <View className="flex-1 gap-4">{filteredNotes.filter((_, i) => i % 2 === 0).map(n => <NoteCard key={n.id} note={n} onPress={() => handleNoteClick(n)} onDelete={() => deleteNote(n.id)} onLongPress={() => handleNoteLongPress(n)} isSelected={selectedNoteIds.includes(n.id)} isMultiSelectActive={isMultiSelectActive} />)}</View>
                        <View className="flex-1 gap-4">{filteredNotes.filter((_, i) => i % 2 !== 0).map(n => <NoteCard key={n.id} note={n} onPress={() => handleNoteClick(n)} onDelete={() => deleteNote(n.id)} onLongPress={() => handleNoteLongPress(n)} isSelected={selectedNoteIds.includes(n.id)} isMultiSelectActive={isMultiSelectActive} />)}</View>
                    </View>
                ) : (
                    <View className="w-full items-center py-32 opacity-20"><StickyNote size={80} color="#94a3b8" /><Text className="text-white font-bold text-xl mt-6">{t('no_notes_found')}</Text></View>
                )}
            </ScrollView>

            <Modal visible={!!editingNote} animationType="slide" statusBarTranslucent onRequestClose={closeNote}>
                <View style={{ backgroundColor: editingNote?.bgStyle?.color || '#0d1117' }} className="flex-1">
                    <SafeAreaView edges={['top']} className={cn("border-b", isDark ? "bg-[#0d1117] border-white/5" : "bg-[#f8fafc] border-black/5")} style={{ backgroundColor: editingNote?.bgStyle?.color || '#0d1117' }}>
                        <View className="flex-row justify-between items-center px-6 py-4">
                            <View className="flex-row items-center gap-2">
                                <TouchableOpacity onPress={closeNote} className={cn("w-12 h-12 rounded-full items-center justify-center border", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}><X size={24} color={isDark ? "#94a3b8" : "#475569"} /></TouchableOpacity>
                                {!isPreviewMode && (
                                    <>
                                        <TouchableOpacity 
                                            onPress={() => updateCurrentNoteState({ isPinned: !editingNote?.isPinned })} 
                                            className={cn("w-12 h-12 rounded-full items-center justify-center border", editingNote?.isPinned ? "bg-blue-500/20 border-blue-500/40" : (isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"))}
                                        >
                                            <Pin size={20} color={editingNote?.isPinned ? "#60a5fa" : (isDark ? "#8b949e" : "#475569")} fill={editingNote?.isPinned ? "#60a5fa" : "transparent"} />
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            onPress={handleToggleLock} 
                                            className={cn("w-12 h-12 rounded-full items-center justify-center border", editingNote?.isLocked ? "bg-amber-500/20 border-amber-500/40" : (isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"))}
                                        >
                                            {editingNote?.isLocked ? <Lock size={20} color="#f59e0b" /> : <Unlock size={20} color={isDark ? "#8b949e" : "#475569"} />}
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                            <View className="flex-row items-center gap-2">
                                {isPreviewMode && (
                                    <>
                                        <TouchableOpacity onPress={handlePrintNote} className={cn("w-12 h-12 rounded-full items-center justify-center border mr-2", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}>
                                            <Printer size={20} color={isDark ? "#8b949e" : "#475569"} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={handleShareNoteImage} className={cn("w-12 h-12 rounded-full items-center justify-center border", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}>
                                            <Share2 size={20} color={isDark ? "#8b949e" : "#475569"} />
                                        </TouchableOpacity>
                                    </>
                                )}
                                {!isPreviewMode && (
                                    <>
                                        <TouchableOpacity 
                                            onPress={() => setShowAttachments(!showAttachments)} 
                                            className={cn("w-12 h-12 rounded-full items-center justify-center border", showAttachments ? "bg-primary/20 border-primary/40" : (isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"))}
                                        >
                                            <Paperclip size={20} color={showAttachments ? "#60a5fa" : (isDark ? "#8b949e" : "#475569")} />
                                        </TouchableOpacity>
                                    </>
                                )}
                                <TouchableOpacity onPress={() => setShowColorPicker(!showColorPicker)} className={cn("w-12 h-12 rounded-full items-center justify-center border", showColorPicker ? "bg-primary/20 border-primary/40" : (isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"))}>
                                    <Palette size={20} color={showColorPicker ? "#60a5fa" : (isDark ? "#8b949e" : "#475569")} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={async () => { if (!isPreviewMode) await handleSaveNote(); setIsPreviewMode(!isPreviewMode); }}
                                    className={cn("px-6 py-3 rounded-3xl border-2", isPreviewMode ? (isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10") : "bg-primary/20 border-primary")}
                                >
                                    <Text className={cn("text-xs font-bold", isPreviewMode ? (isDark ? "text-white" : "text-slate-800") : "text-primary")}>{isPreviewMode ? t('edit').toUpperCase() : t('finish').toUpperCase()}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </SafeAreaView>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : (isKeyboardVisible ? 'padding' : undefined)} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (isKeyboardVisible ? 50 : 0)} className="flex-1">
                        {showColorPicker && (
                            <View className={cn("px-6 py-5 border-b", isDark ? "bg-[#161b22] border-white/5" : "bg-[#f1f5f9] border-black/5")}>
                                <Text className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", isDark ? "text-white/40" : "text-slate-500")}>Couleur de la Fiche (Dashboard)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1 mb-4">
                                    {NOTE_COLORS.map(c => (
                                        <TouchableOpacity 
                                            key={c.value} 
                                            onPress={() => updateCurrentNoteState({ color: c.value })} 
                                            style={{ backgroundColor: c.value }} 
                                            className={cn("w-10 h-10 rounded-full border-2 mr-3", editingNote?.color === c.value ? (isDark ? "border-white" : "border-slate-800") : "border-transparent")} 
                                        />
                                    ))}
                                </ScrollView>

                                <Text className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", isDark ? "text-white/40" : "text-slate-500")}>Couleur de Page (Arrière-plan)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1 mb-4">
                                    {PAPER_COLORS.map(c => (
                                        <TouchableOpacity 
                                            key={c.value} 
                                            onPress={() => {
                                                const currentBg = editingNote?.bgStyle || { color: '#0d1117', pattern: 'blank' };
                                                updateCurrentNoteState({ bgStyle: { ...currentBg, color: c.value } });
                                            }} 
                                            style={{ backgroundColor: c.value }} 
                                            className={cn("w-10 h-10 rounded-full border-2 mr-3 justify-center items-center", (editingNote?.bgStyle?.color || '#0d1117') === c.value ? (isDark ? "border-white" : "border-slate-800") : "border-white/10")}
                                        >
                                            {(!isColorDark(c.value)) && <View className="w-1.5 h-1.5 rounded-full bg-slate-800" />}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", isDark ? "text-white/40" : "text-slate-500")}>Motif de Page</Text>
                                <View className="flex-row gap-3 py-1">
                                    {PAPER_PATTERNS.map(p => {
                                        const isActive = (editingNote?.bgStyle?.pattern || 'blank') === p.id;
                                        return (
                                            <TouchableOpacity
                                                key={p.id}
                                                onPress={() => {
                                                    const currentBg = editingNote?.bgStyle || { color: '#0d1117', pattern: 'blank' };
                                                    updateCurrentNoteState({ bgStyle: { ...currentBg, pattern: p.id as any } });
                                                }}
                                                className={cn(
                                                    "px-4 py-2.5 rounded-2xl border flex-row items-center",
                                                    isActive 
                                                        ? (isDark ? "bg-primary/20 border-primary" : "bg-primary/10 border-primary") 
                                                        : (isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5")
                                                )}
                                            >
                                                <Text className={cn("text-xs font-bold", isActive ? "text-primary" : (isDark ? "text-slate-400" : "text-slate-600"))}>{p.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Typography Options */}
                                <Text className={cn("text-[10px] font-bold uppercase tracking-wider mb-3 mt-4", isDark ? "text-white/40" : "text-slate-500")}>Police du Texte</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row gap-3 py-1 mb-2">
                                    {TEXT_FONTS.map(f => {
                                        const isActive = (editingNote?.textStyle?.fontFamily || 'Lexend_400Regular') === f.id;
                                        return (
                                            <TouchableOpacity key={f.id} onPress={() => { const currentTs = editingNote?.textStyle || {}; updateCurrentNoteState({ textStyle: { ...currentTs, fontFamily: f.id as any } }); }} className={cn("w-20 py-3 rounded-2xl border items-center", isActive ? (isDark ? "bg-primary/20 border-primary" : "bg-primary/10 border-primary") : (isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"))}>
                                                <Text style={{ fontFamily: f.id, fontSize: 20 }} className={cn(isActive ? "text-primary" : (isDark ? "text-white" : "text-slate-800"))}>{f.preview}</Text>
                                                <Text style={{ fontFamily: 'Lexend_400Regular', fontSize: 9 }} className={cn("mt-1 font-bold uppercase tracking-wider", isActive ? "text-primary" : (isDark ? "text-white/40" : "text-slate-500"))}>{f.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    </View>
                                </ScrollView>

                                <Text className={cn("text-[10px] font-bold uppercase tracking-wider mb-2 mt-4", isDark ? "text-white/40" : "text-slate-500")}>Taille & Alignement</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                                    {TEXT_SIZES.map(s => {
                                        const isActive = (editingNote?.textStyle?.fontSize || 20) === s.id;
                                        return (
                                            <TouchableOpacity key={`sz_${s.id}`} onPress={() => { const currentTs = editingNote?.textStyle || {}; updateCurrentNoteState({ textStyle: { ...currentTs, fontSize: s.id } }); }} className={cn("px-4 py-2.5 rounded-2xl border mr-3", isActive ? (isDark ? "bg-primary/20 border-primary" : "bg-primary/10 border-primary") : (isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"))}>
                                                <Text className={cn("text-xs font-bold", isActive ? "text-primary" : (isDark ? "text-slate-400" : "text-slate-600"))}>{s.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    <View className="w-[1px] h-6 bg-white/10 mx-2 self-center" />
                                    {TEXT_ALIGNS.map(a => {
                                        const isActive = (editingNote?.textStyle?.textAlign || 'left') === a.id;
                                        return (
                                            <TouchableOpacity key={`al_${a.id}`} onPress={() => { const currentTs = editingNote?.textStyle || {}; updateCurrentNoteState({ textStyle: { ...currentTs, textAlign: a.id as any } }); }} className={cn("w-10 h-10 rounded-2xl border mr-3 items-center justify-center", isActive ? (isDark ? "bg-primary/20 border-primary" : "bg-primary/10 border-primary") : (isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"))}>
                                                {a.id === 'left' && <AlignLeft size={16} color={isActive ? "#3b82f6" : "#8b949e"} />}
                                                {a.id === 'center' && <AlignCenter size={16} color={isActive ? "#3b82f6" : "#8b949e"} />}
                                                {a.id === 'right' && <AlignRight size={16} color={isActive ? "#3b82f6" : "#8b949e"} />}
                                                {a.id === 'justify' && <AlignJustify size={16} color={isActive ? "#3b82f6" : "#8b949e"} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                            </View>
                        )}
                        {showHighlighter && !isPreviewMode && (
                            <View className="px-6 py-4 bg-white/5 border-b border-white/5">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-2">
                                    {HIGHLIGHT_COLORS.map(c => <TouchableOpacity key={c.id} onPress={() => { insertMarkdown(`<mark style="background-color: ${c.text}">`, '</mark>'); setShowHighlighter(false); }} style={{ backgroundColor: c.text }} className="w-12 h-12 rounded-full border-2 border-white/20 mr-4" />)}
                                    <TouchableOpacity onPress={() => { setCustomColorInput("#"); setColorPromptType('highlight'); setShowColorPrompt(true); }} className="w-12 h-12 rounded-full border-2 border-dashed border-white/40 items-center justify-center mr-4"><Plus size={20} color="white" /></TouchableOpacity>
                                </ScrollView>
                            </View>
                        )}
                        <ViewShot ref={noteViewShotRef} style={{ flex: 1, backgroundColor: editingNote?.bgStyle?.color || '#0d1117' }} options={{ format: "jpg", quality: 0.95 }}>
                            <ScrollView ref={scrollViewRef} className="flex-1 px-6 pt-2" keyboardShouldPersistTaps="always" contentContainerStyle={{ flexGrow: 1 }} scrollEnabled={laserMode === 'off'}>
                                {editingNote && (
                                    <View className="relative flex-1" style={{ minHeight: '100%' }}>
                                        <PaperBackground pattern={editingNote.bgStyle?.pattern || 'blank'} color={editingNote.bgStyle?.color || '#0d1117'} />
                                        
                                        <View className="mb-6 z-10">
                                            <Text className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", isDark ? "text-white/30" : "text-slate-400")}>{new Date(editingNote.date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                                            <View className="flex-row items-start justify-between">
                                                <TextInput placeholder={t('note_title_placeholder')} placeholderTextColor={placeholderColor} className={cn("text-3xl font-bold flex-1 mr-4", textColorClass)} multiline style={{ fontFamily: 'Lexend_700Bold' }} value={editingNote.title} onChangeText={t => updateCurrentNoteState({ title: t })} />
                                                <TouchableOpacity onPress={() => setShowFolderModal(true)} className={cn("border px-4 py-2.5 rounded-2xl flex-row items-center mt-1", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5")}><Folder size={14} color="#3b82f6" className="mr-2" /><Text className={cn("text-xs font-bold", isDark ? "text-white/60" : "text-slate-600")}>{editingNote.folder || t('category')}</Text></TouchableOpacity>
                                            </View>
                                        </View>
                                        {showAttachments && (
                                            <View className={cn("mb-10 rounded-[40px] p-8 border z-10", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}>
                                                <View className="flex-row justify-between items-center mb-8">
                                                    <Text className={cn("font-bold text-xs uppercase tracking-widest", isDark ? "text-white/40" : "text-slate-500")}>Pièces Jointes</Text>
                                                    <View className="flex-row gap-3">
                                                        <TouchableOpacity onPress={() => pickMedia(false, 'All')} className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center"><LayoutGrid size={18} color="#3b82f6" /></TouchableOpacity>
                                                        <TouchableOpacity onPress={() => pickMedia(true, 'Images')} className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center"><Camera size={18} color="#3b82f6" /></TouchableOpacity>
                                                        <TouchableOpacity onPress={() => pickMedia(true, 'Videos')} className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center"><Video size={18} color="#3b82f6" /></TouchableOpacity>
                                                        <TouchableOpacity onPress={() => { setRecordMode('attachment'); setShowVoiceModal(true); }} className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center"><Mic size={18} color="#3b82f6" /></TouchableOpacity>
                                                    </View>
                                                </View>
                                                <ScrollView horizontal className="mb-4">{editingNote.attachments?.videos?.map((u, i) => (
                                                    <TouchableOpacity key={i} className="mr-4"><View className="w-24 h-24 rounded-2xl bg-black items-center justify-center border border-white/20"><Play size={20} color="white" /></View><TouchableOpacity onPress={() => { const nv = editingNote.attachments?.videos?.filter((_, x) => x !== i); updateCurrentNoteState({ attachments: { ...editingNote.attachments, videos: nv } }) }} className="absolute -top-1 -right-1 w-6 h-6 bg-black rounded-full items-center justify-center"><X size={12} color="white" /></TouchableOpacity></TouchableOpacity>
                                                ))}</ScrollView>
                                                <ScrollView horizontal className="mb-4">{editingNote.attachments?.images?.map((u, i) => (
                                                    <TouchableOpacity key={i} onPress={() => setSelectedImage(u)} className="mr-4"><RNImage source={{ uri: u }} className="w-24 h-24 rounded-2xl" /><TouchableOpacity onPress={() => { const ni = editingNote.attachments?.images?.filter((_, x) => x !== i); updateCurrentNoteState({ attachments: { ...editingNote.attachments, images: ni } }) }} className="absolute -top-1 -right-1 w-6 h-6 bg-black rounded-full items-center justify-center"><X size={12} color="white" /></TouchableOpacity></TouchableOpacity>
                                                ))}</ScrollView>
                                                {editingNote.attachments?.voice?.map((v, i) => <AudioPlayer key={i} uri={v.uri} onDelete={() => { const nv = editingNote.attachments?.voice?.filter((_, x) => x !== i); updateCurrentNoteState({ attachments: { ...editingNote.attachments, voice: nv } }); }} />)}
                                            </View>
                                        )}
                                        {editingNote.type === 'draw' && editingNote.attachments?.images?.length ? (
                                            <View className="mb-10 z-10">
                                                <TouchableOpacity onPress={() => setSelectedImage(editingNote.attachments!.images![editingNote.attachments!.images!.length - 1])}><RNImage source={{ uri: editingNote.attachments.images[editingNote.attachments.images.length - 1] }} className="w-full aspect-square rounded-[40px]" resizeMode="cover" /></TouchableOpacity>
                                                <TouchableOpacity onPress={() => setShowDrawModal(true)} className="absolute bottom-4 right-4 bg-purple-600 w-12 h-12 rounded-full items-center justify-center shadow-lg"><Palette size={20} color="white" /></TouchableOpacity>
                                            </View>
                                        ) : null}
                                        {isPreviewMode ? (
                                            <View className="pb-32 z-10">{renderNoteContent(editingNote.content)}</View>
                                        ) : (
                                            <>
                                                <TextInput ref={textInputRef} multiline textAlignVertical="top" placeholder={t('note_content_placeholder')} placeholderTextColor={placeholderColor} className={cn("leading-8 min-h-[400px] mb-32 z-10", textColorClass)} style={{ fontFamily: editingNote.textStyle?.fontFamily || 'Lexend_400Regular', fontSize: editingNote.textStyle?.fontSize || 20, textAlign: editingNote.textStyle?.textAlign || 'left' }} value={editingNote.content || ""} onChangeText={t => { updateCurrentNoteState({ content: t }); pushHistoryState(t, false); }} onSelectionChange={e => setSelection(e.nativeEvent.selection)} />
                                            </>
                                        )}
                                    </View>
                                )}
                            </ScrollView>
                            {isPreviewMode && laserMode !== 'off' && (
                                <LaserPointerOverlay type={laserMode} />
                            )}
                        </ViewShot>
                        {!isPreviewMode && editingNote && (
                            <View className={cn("px-4 py-2 flex-row justify-between items-center border-t border-white/5", isDark ? "bg-[#161b22]" : "bg-[#f1f5f9]")}>
                                <Text className={cn("text-[10px] font-bold", isDark ? "text-white/60" : "text-slate-500")}>
                                    {editingNote.content ? editingNote.content.trim().split(/\s+/).filter(Boolean).length : 0} {t('words' as any) || 'mots'}  •  {editingNote.content ? editingNote.content.length : 0} {t('chars' as any) || 'caractères'}
                                </Text>
                                <Text className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-white/60" : "text-slate-500")}>
                                    Lecture ~{Math.max(1, Math.ceil((editingNote.content ? editingNote.content.length : 0) / 1000))} min
                                </Text>
                            </View>
                        )}
                        {!isPreviewMode && editingNote && (
                            <SafeAreaView edges={['bottom']} className={cn("border-t pt-3 px-4 pb-4", isDark ? "bg-[#161b22] border-white/10" : "bg-[#f8fafc] border-black/10")}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                    <TouchableOpacity onPress={undo} disabled={historyState.index <= 0} className={cn("w-11 h-11 bg-white/5 rounded-xl items-center justify-center", historyState.index <= 0 ? "opacity-30" : "")}><Undo2 size={18} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={redo} disabled={historyState.index >= historyState.stack.length - 1} className={cn("w-11 h-11 bg-white/5 rounded-xl items-center justify-center mx-2", historyState.index >= historyState.stack.length - 1 ? "opacity-30" : "")}><Redo2 size={18} color="#8b949e" /></TouchableOpacity>
                                    <View className="w-[1px] h-8 bg-white/10 mr-2.5 self-center" />
                                    
                                    <TouchableOpacity onPress={() => setShowDrawModal(true)} className="w-11 h-11 bg-white/5 rounded-xl items-center justify-center"><Edit size={20} color="#8b949e" /></TouchableOpacity>
                                    <View className="w-[1px] h-8 bg-white/10 mx-2.5 self-center" />
                                    
                                    <TouchableOpacity onPress={() => insertMarkdown('**', '**')} className="w-11 h-11 bg-white/5 rounded-xl items-center justify-center"><Bold size={18} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => insertMarkdown('*', '*')} className="w-11 h-11 bg-white/5 rounded-xl items-center justify-center mx-2"><Italic size={18} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => insertMarkdown('# ', '')} className="w-11 h-11 bg-white/5 rounded-xl items-center justify-center"><Heading size={18} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => insertMarkdown('- ', '')} className="w-11 h-11 bg-white/5 rounded-xl items-center justify-center mx-2"><List size={18} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => insertMarkdown('- [ ] ', '')} className="w-11 h-11 bg-white/5 rounded-xl items-center justify-center"><Square size={18} color="#8b949e" /></TouchableOpacity>
                                    
                                    <View className="w-[1px] h-8 bg-white/10 mx-2.5 self-center" />
                                    <TouchableOpacity onPress={() => { const refNum = (editingNote.content.match(/\[\^(\d+)\]/g)?.length || 0) + 1; insertMarkdown(`[^${refNum}]`, `\n\n[^${refNum}]: `); }} className="w-11 h-11 bg-white/5 rounded-xl items-center justify-center"><Footprints size={18} color="#8b949e" /></TouchableOpacity>
                                    
                                    <View className="w-[1px] h-8 bg-white/10 mx-2.5 self-center" />
                                    <TouchableOpacity onPress={() => pickAndInsertMedia('image')} className="w-11 h-11 bg-white/5 rounded-xl items-center justify-center"><Camera size={18} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => pickAndInsertMedia('video')} className="w-11 h-11 bg-white/5 rounded-xl items-center justify-center mx-2"><Video size={18} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setRecordMode('inline'); setShowVoiceModal(true); }} className="w-11 h-11 bg-white/5 rounded-xl items-center justify-center"><Mic size={18} color="#8b949e" /></TouchableOpacity>
                                    
                                    <View className="w-[1px] h-8 bg-white/10 mx-2.5 self-center" />
                                    <TouchableOpacity onPress={() => setShowHighlighter(!showHighlighter)} className={cn("w-11 h-11 rounded-xl items-center justify-center", showHighlighter ? "bg-primary/20" : "bg-white/5")}><Highlighter size={18} color={showHighlighter ? "#60a5fa" : "#8b949e"} /></TouchableOpacity>
                                </ScrollView>
                            </SafeAreaView>
                        )}
                        {isPreviewMode && editingNote && (
                            <SafeAreaView edges={['bottom']} style={{ zIndex: 1010 }} className="absolute bottom-6 self-center bg-[#1c2128]/90 px-4 py-3 rounded-full border border-white/10 flex-row gap-4 items-center shadow-xl">
                                <TouchableOpacity onPress={() => setLaserMode('off')} className={cn("w-10 h-10 rounded-full items-center justify-center", laserMode === 'off' ? "bg-white/20" : "bg-transparent")}>
                                    <X size={20} color={laserMode === 'off' ? "white" : "#94a3b8"} />
                                </TouchableOpacity>
                                <View className="w-[1px] h-6 bg-white/10" />
                                <TouchableOpacity onPress={() => setLaserMode('dot')} className={cn("w-10 h-10 rounded-full items-center justify-center", laserMode === 'dot' ? "bg-red-500/20" : "bg-transparent")}>
                                    <Pointer size={20} color={laserMode === 'dot' ? "#ef4444" : "#94a3b8"} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setLaserMode('trail_red')} className={cn("w-10 h-10 rounded-full items-center justify-center", laserMode === 'trail_red' ? "bg-red-500/20" : "bg-transparent")}>
                                    <Activity size={20} color={laserMode === 'trail_red' ? "#ef4444" : "#94a3b8"} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setLaserMode('trail_highlight')} className={cn("w-10 h-10 rounded-full items-center justify-center", laserMode === 'trail_highlight' ? "bg-yellow-400/20" : "bg-transparent")}>
                                    <Zap size={20} color={laserMode === 'trail_highlight' ? "#facc15" : "#94a3b8"} />
                                </TouchableOpacity>
                            </SafeAreaView>
                        )}
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            <Modal visible={showVoiceModal} transparent animationType="slide">
                <SafeAreaView className="flex-1 justify-end">
                    <View className="bg-[#1c2128] m-4 rounded-[40px] p-8 border border-white/10 items-center">
                        <Text className="text-white/40 font-bold text-xs uppercase tracking-[4px] mb-8">Vocal</Text>
                        <View className="items-center mb-10">
                            <Text className="text-5xl font-mono text-white mb-2">{Math.floor(recordDuration / 60)}:{String(recordDuration % 60).padStart(2, '0')}</Text>
                            <Text className="text-red-500 animate-pulse font-bold text-xs">{isRecording ? "EN COURS" : "PRÊT"}</Text>
                        </View>
                        <View className="flex-row gap-6 items-center">
                            <TouchableOpacity onPress={() => isRecording ? stopRecording(false) : setShowVoiceModal(false)} className="w-16 h-16 rounded-full bg-white/5 items-center justify-center"><X size={24} color="#94a3b8" /></TouchableOpacity>
                            <TouchableOpacity onPress={isRecording ? () => stopRecording(true) : startRecording} className={cn("w-24 h-24 rounded-full items-center justify-center", isRecording ? "bg-red-500" : "bg-primary")}>{isRecording ? <Square size={32} color="white" fill="white" /> : <Mic size={40} color="white" />}</TouchableOpacity>
                            <TouchableOpacity onPress={() => isRecording ? stopRecording(true) : null} disabled={!isRecording} className={cn("w-16 h-16 rounded-full bg-white/5 items-center justify-center", !isRecording && "opacity-20")}><Check size={24} color={isRecording ? "#3b82f6" : "#94a3b8"} /></TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>

            <Modal visible={!!selectedImage} transparent animationType="fade">
                <View className="flex-1 bg-black">
                    <TouchableOpacity onPress={() => setSelectedImage(null)} className="absolute top-12 right-6 z-50 w-12 h-12 bg-white/10 rounded-full items-center justify-center"><X size={24} color="white" /></TouchableOpacity>
                    {(() => {
                        const inlineImages = editingNote?.content?.match(/\[image:\s*([^\]]+)\]/gi)?.map(m => m.match(/\[image:\s*([^\]]+)\]/i)![1]) || [];
                        const attachmentImages = editingNote?.attachments?.images || [];
                        const allImages = Array.from(new Set([...attachmentImages, ...inlineImages]));
                        const currentIndex = allImages.indexOf(selectedImage!);
                        return (
                            <>
                                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: (currentIndex >= 0 ? currentIndex : 0) * windowWidth, y: 0 }}>
                                    {allImages.map((img, idx) => <View key={idx} style={{ width: windowWidth }} className="justify-center items-center"><RNImage source={{ uri: img }} className="w-full h-full" resizeMode="contain" /></View>)}
                                </ScrollView>
                                <View className="absolute bottom-12 w-full items-center"><View className="bg-black/50 px-6 py-3 rounded-full"><Text className="text-white font-bold text-xs">{(currentIndex >= 0 ? currentIndex : 0) + 1} / {allImages.length}</Text></View></View>
                            </>
                        );
                    })()}
                </View>
            </Modal>

            <DrawModal visible={showDrawModal} onClose={() => setShowDrawModal(false)} initialUri={editingNote?.type === 'draw' && editingNote.attachments?.images?.length ? editingNote.attachments.images[editingNote.attachments.images.length - 1] : undefined} onSave={(u) => { if (editingNote) { const ni = editingNote.type === 'draw' ? [u] : [...(editingNote.attachments?.images || []), u]; updateCurrentNoteState({ attachments: { ...editingNote.attachments, images: ni } }); } setShowDrawModal(false); }} />

            <Modal visible={showFolderModal} transparent animationType="slide">
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-[#0f172a] rounded-t-[40px] p-8">
                        <View className="flex-row justify-between items-center mb-8">
                            <View>
                              <Text className="text-white font-bold text-2xl">
                                {editingFolderName ? `Renommer "${editingFolderName}"` : 'Dossiers'}
                              </Text>
                              {!editingFolderName && <Text className="text-slate-500 text-xs mt-1">Maintenez appuyé une catégorie pour la renommer ou supprimer</Text>}
                            </View>
                            <TouchableOpacity onPress={() => { setShowFolderModal(false); setEditingFolderName(null); setNewFolderName(""); }}><X size={24} color="#94a3b8" /></TouchableOpacity>
                        </View>

                        {/* Folder list — shown only in selection/create mode (not rename mode) */}
                        {!editingFolderName && (
                          <ScrollView className="max-h-[200px] mb-8">
                            <View className="flex-row flex-wrap gap-3">
                              <TouchableOpacity
                                onPress={() => { if (editingNote) updateCurrentNoteState({ folder: undefined }); setShowFolderModal(false); }}
                                className={cn("px-6 py-4 rounded-3xl border", !editingNote?.folder ? "bg-primary border-primary" : "bg-white/5 border-white/10")}
                              >
                                <Text className={cn("font-bold text-sm", !editingNote?.folder ? "text-white" : "text-slate-400")}>Aucun</Text>
                              </TouchableOpacity>
                              {folders.map(f => (
                                <View key={f} className="flex-row items-center">
                                  <TouchableOpacity
                                    onPress={() => { if (editingNote) updateCurrentNoteState({ folder: f }); setShowFolderModal(false); }}
                                    className={cn("px-6 py-4 rounded-l-3xl border-y border-l", editingNote?.folder === f ? "bg-primary border-primary" : "bg-white/5 border-white/10")}
                                  >
                                    <Text className={cn("font-bold text-sm", editingNote?.folder === f ? "text-white" : "text-slate-400")}>{f}</Text>
                                  </TouchableOpacity>
                                  {/* Edit button per folder */}
                                  <TouchableOpacity
                                    onPress={() => { setEditingFolderName(f); setNewFolderName(f); }}
                                    className={cn("px-3 py-4 rounded-r-3xl border-y border-r items-center justify-center", editingNote?.folder === f ? "bg-primary/80 border-primary" : "bg-white/5 border-white/10")}
                                  >
                                    <Edit size={12} color={editingNote?.folder === f ? "white" : "#64748b"} />
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                          </ScrollView>
                        )}

                        {/* Input: create new OR rename existing */}
                        <View className="flex-row gap-3">
                            <TextInput
                              placeholder={editingFolderName ? `Nouveau nom pour "${editingFolderName}"` : "Nouveau dossier..."}
                              placeholderTextColor="#475569"
                              className="flex-1 bg-white/5 p-5 rounded-3xl text-white font-bold"
                              value={newFolderName}
                              onChangeText={setNewFolderName}
                              autoFocus={!!editingFolderName}
                            />
                            <TouchableOpacity
                              onPress={async () => {
                                if (!newFolderName.trim()) { setShowFolderModal(false); setEditingFolderName(null); setNewFolderName(""); return; }
                                if (editingFolderName) {
                                  // Rename: replace old name with new name everywhere
                                  const trimmed = newFolderName.trim();
                                  const u = folders.map(x => x === editingFolderName ? trimmed : x);
                                  setFolders(u);
                                  await saveFolders(u);
                                  // Update notes that had the old folder name
                                  const updatedNotes = notes.map(n => n.folder === editingFolderName ? { ...n, folder: trimmed } : n);
                                  setNotes(updatedNotes);
                                  await Promise.all(updatedNotes.filter(n => n.folder === trimmed && notes.find(o => o.id === n.id)?.folder === editingFolderName).map(n => saveNote(n)));
                                  if (selectedFolder === editingFolderName) setSelectedFolder(trimmed);
                                  if (editingNote?.folder === editingFolderName) updateCurrentNoteState({ folder: trimmed });
                                  setEditingFolderName(null);
                                } else {
                                  // Create new
                                  const trimmed = newFolderName.trim();
                                  const u = Array.from(new Set([...folders, trimmed]));
                                  setFolders(u);
                                  await saveFolders(u);
                                  if (editingNote) updateCurrentNoteState({ folder: trimmed });
                                  setShowFolderModal(false);
                                }
                                setNewFolderName("");
                              }}
                              className="w-16 bg-blue-600 rounded-3xl items-center justify-center"
                            >
                              <Check size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        {editingFolderName && (
                          <TouchableOpacity onPress={() => { setEditingFolderName(null); setNewFolderName(""); }} className="mt-4 items-center">
                            <Text className="text-slate-500 text-sm">Annuler le renommage</Text>
                          </TouchableOpacity>
                        )}
                        <View className="h-10" />
                    </View>
                </View>
            </Modal>

            <Modal visible={!!detectedVerse} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setDetectedVerse(null)}>
                <View className="flex-1 bg-black/75 justify-end">
                    <TouchableOpacity activeOpacity={1} onPress={() => setDetectedVerse(null)} className="absolute inset-0" />
                    <View className="bg-slate-900 rounded-t-[40px] p-8 border-t border-white/10 shadow-2xl" style={{ maxHeight: '85%' }}>
                        <View className="flex-row justify-between items-center mb-6">
                            <View className="flex-1 mr-4">
                                <Text className="text-white font-bold text-xl">
                                    {detectedVerse ? `${detectedVerse.book} ${detectedVerse.chapter}:${detectedVerse.verses.replace(/;\s*/g, '; ')}` : ""}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setDetectedVerse(null)} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
                                <X size={20} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView className="mb-8" showsVerticalScrollIndicator={false}>
                            {verseLoading ? (
                                <ActivityIndicator color="#3b82f6" className="py-8" />
                            ) : (
                                <Markdown
                                    style={{
                                        body: { color: '#cbd5e1', fontSize: 17, lineHeight: 28, fontFamily: 'Lexend_400Regular' },
                                        strong: { color: '#3b82f6', fontWeight: 'bold', fontFamily: 'Lexend_700Bold' },
                                        paragraph: { marginBottom: 12 }
                                    }}
                                >
                                    {(verseContent || "").replace(/^(\d+)\.\s+/gm, '$1\\. ')}
                                </Markdown>
                            )}
                        </ScrollView>
                        <TouchableOpacity onPress={() => { if (currentVerseBookId) router.push({ pathname: "/bible/reader", params: { bookId: String(currentVerseBookId), bookName: detectedVerse?.book || '', chapter: String(detectedVerse?.chapter || '1'), verse: String((detectedVerse?.verses || "").split(/[-,;]/)[0] || "1"), lang: globalSettings.bibleVersion, testament: "1" } }); setDetectedVerse(null); }} className="bg-blue-600 py-5 rounded-3xl items-center"><Text className="text-white font-bold text-lg">Ouvrir dans la Bible</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showColorPrompt} transparent animationType="slide">
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-[#0f172a] rounded-t-[40px] p-8">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-white font-bold text-xl">Couleur personnalisée</Text>
                            <TouchableOpacity onPress={() => setShowColorPrompt(false)}><X size={24} color="#94a3b8" /></TouchableOpacity>
                        </View>
                        <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-1 mb-6">
                            <View style={{ backgroundColor: customColorInput }} className="w-8 h-8 rounded-full mr-3" />
                            <TextInput placeholder="#FFFFFF" placeholderTextColor="#475569" className="flex-1 h-12 text-white font-bold text-lg" value={customColorInput} onChangeText={setCustomColorInput} autoCapitalize="characters" maxLength={7} />
                        </View>
                        <View className="mb-10 items-center">
                            <View onLayout={(e) => setPickerSize(e.nativeEvent.layout)} className="w-full aspect-square rounded-3xl overflow-hidden mb-6 bg-white">
                                <LinearGradient colors={[`hsl(${pickerH}, 100%, 50%)`, 'white']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} className="flex-1">
                                    <LinearGradient colors={['transparent', 'black']} className="flex-1">
                                        <View {...PanResponder.create({ onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderGrant: (e) => { const s = (e.nativeEvent.locationX / pickerSize.width) * 100; const v = 100 - (e.nativeEvent.locationY / pickerSize.height) * 100; setPickerS(s); setPickerV(v); setCustomColorInput(hsvToHex(pickerH, s, v)); }, onPanResponderMove: (e) => { const s = (e.nativeEvent.locationX / pickerSize.width) * 100; const v = 100 - (e.nativeEvent.locationY / pickerSize.height) * 100; setPickerS(s); setPickerV(v); setCustomColorInput(hsvToHex(pickerH, s, v)); } }).panHandlers} className="flex-1" />
                                    </LinearGradient>
                                </LinearGradient>
                            </View>
                            <LinearGradient colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="w-full h-10 rounded-full">
                                <View {...PanResponder.create({ onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderGrant: (e) => { const h = (e.nativeEvent.locationX / pickerSize.width) * 360; setPickerH(h); setCustomColorInput(hsvToHex(h, pickerS, pickerV)); }, onPanResponderMove: (e) => { const h = (e.nativeEvent.locationX / pickerSize.width) * 360; setPickerH(h); setCustomColorInput(hsvToHex(h, pickerS, pickerV)); } }).panHandlers} className="flex-1" />
                            </LinearGradient>
                        </View>
                        <TouchableOpacity onPress={() => { if (/^#[0-9A-F]{3,6}$/i.test(customColorInput)) { if (colorPromptType === 'note') updateCurrentNoteState({ color: customColorInput }); else insertMarkdown(`<mark style="background-color: ${customColorInput}">`, '</mark>'); setShowColorPrompt(false); } }} className="w-full p-5 rounded-3xl bg-primary items-center"><Text className="text-white font-bold text-lg">Appliquer</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showNoteTypeModal} transparent animationType="slide">
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-[#0f172a] rounded-t-[40px] p-8">
                        <View className="items-center mb-8">
                            <View className="w-12 h-1.5 bg-white/10 rounded-full mb-6" />
                            <Text className="text-white text-2xl font-bold mb-2">{t('create_note')}</Text>
                        </View>
                        <ScrollView className="max-h-[400px] mb-6">
                            {NOTE_TEMPLATES.map((tmpl) => {
                                const IconComponent = tmpl.id === 'blank' ? StickyNote : (tmpl.id === 'bible_study' ? BookOpen : (tmpl.id === 'sermon' ? Mic : Footprints));
                                return (
                                    <TouchableOpacity key={tmpl.id} onPress={() => handleCreateNote('text', tmpl)} className="bg-white/5 p-6 rounded-3xl flex-row items-center mb-4 border border-white/10">
                                        <View style={{ backgroundColor: tmpl.color + '20' }} className="w-12 h-12 rounded-2xl items-center justify-center mr-4"><IconComponent size={24} color={tmpl.color} /></View>
                                        <View className="flex-1"><Text className="text-white font-bold text-lg">{tmpl.title}</Text><Text className="text-white/40 text-xs">{tmpl.description}</Text></View>
                                    </TouchableOpacity>
                                );
                            })}
                            <TouchableOpacity onPress={() => handleCreateNote('draw')} className="bg-white/5 p-6 rounded-3xl flex-row items-center border border-white/10"><View className="w-12 h-12 rounded-2xl bg-purple-500/20 items-center justify-center mr-4"><Palette size={24} color="#a78bfa" /></View><View className="flex-1"><Text className="text-white font-bold text-lg">Dessin</Text><Text className="text-white/40 text-xs">Exprimez vos idées visuellement.</Text></View></TouchableOpacity>
                        </ScrollView>
                        <TouchableOpacity onPress={() => setShowNoteTypeModal(false)} className="py-5 bg-white/5 rounded-3xl items-center"><Text className="text-white/60 font-bold">{t('cancel')}</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Folder Action Sheet (dark themed, replaces Alert.alert) ── */}
            <Modal visible={!!folderActionSheet} transparent animationType="slide">
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => setFolderActionSheet(null)}
                  className="flex-1 bg-black/70 justify-end"
                >
                    <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
                        <View className="bg-[#0f172a] rounded-t-[40px] p-8 border-t border-white/10">
                            {/* Handle bar */}
                            <View className="w-12 h-1.5 bg-white/10 rounded-full self-center mb-6" />

                            {/* Category name */}
                            <View className="flex-row items-center mb-8">
                                <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center mr-4 border border-primary/20">
                                    <Folder size={18} color="#3b82f6" />
                                </View>
                                <View>
                                    <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Catégorie</Text>
                                    <Text className="text-white text-xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>{folderActionSheet}</Text>
                                </View>
                            </View>

                            {/* Actions */}
                            <View className="gap-3 mb-4">
                                {/* Rename */}
                                <TouchableOpacity
                                    onPress={() => {
                                        const f = folderActionSheet!;
                                        setFolderActionSheet(null);
                                        setEditingFolderName(f);
                                        setNewFolderName(f);
                                        setShowFolderModal(true);
                                    }}
                                    className="flex-row items-center bg-white/5 border border-white/10 p-5 rounded-3xl"
                                >
                                    <View className="w-10 h-10 rounded-2xl bg-blue-500/10 items-center justify-center mr-4">
                                        <Edit size={18} color="#60a5fa" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-bold text-base">Renommer</Text>
                                        <Text className="text-slate-500 text-xs mt-0.5">Changer le nom de cette catégorie</Text>
                                    </View>
                                    <ChevronRight size={16} color="#475569" />
                                </TouchableOpacity>

                                {/* Delete */}
                                <TouchableOpacity
                                    onPress={() => {
                                        const f = folderActionSheet!;
                                        setFolderActionSheet(null);
                                        setAlertConfig({
                                            visible: true,
                                            title: `Supprimer "${f}"`,
                                            message: `Voulez-vous supprimer cette catégorie ? Les notes qu'elle contient ne seront pas supprimées.`,
                                            type: 'error',
                                            onConfirm: async () => {
                                                const u = folders.filter(x => x !== f);
                                                setFolders(u);
                                                await saveFolders(u);
                                                if (selectedFolder === f) setSelectedFolder("all");
                                            }
                                        });
                                    }}
                                    className="flex-row items-center bg-red-500/5 border border-red-500/20 p-5 rounded-3xl"
                                >
                                    <View className="w-10 h-10 rounded-2xl bg-red-500/10 items-center justify-center mr-4">
                                        <Trash2 size={18} color="#ef4444" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-red-400 font-bold text-base">Supprimer</Text>
                                        <Text className="text-slate-500 text-xs mt-0.5">Supprimer uniquement la catégorie</Text>
                                    </View>
                                    <ChevronRight size={16} color="#475569" />
                                </TouchableOpacity>
                            </View>

                            {/* Cancel */}
                            <TouchableOpacity
                                onPress={() => setFolderActionSheet(null)}
                                className="bg-white/5 border border-white/10 py-5 rounded-3xl items-center"
                            >
                                <Text className="text-slate-400 font-bold">Annuler</Text>
                            </TouchableOpacity>
                            <View className="h-6" />
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            <PremiumAlert 
              visible={alertConfig.visible}
              title={alertConfig.title}
              message={alertConfig.message}
              type={alertConfig.type}
              onConfirm={alertConfig.onConfirm}
              onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
            />

            {/* Safe PIN Security Code Modal */}
            <Modal visible={isPinCodeModalVisible} transparent animationType="fade">
                <View className="flex-1 bg-black/80 items-center justify-center p-6">
                    <View className="bg-[#1c2128] border border-white/10 w-full max-w-sm rounded-[40px] p-8 items-center shadow-2xl">
                        <View className="w-16 h-16 rounded-3xl bg-amber-500/10 items-center justify-center mb-6">
                            <Lock size={28} color="#f59e0b" />
                        </View>
                        <Text className="text-white text-xl font-bold text-center mb-2" style={{ fontFamily: 'Lexend_700Bold' }}>
                            {isSettingPinCode ? "Créer un Code PIN" : "Note Verrouillée"}
                        </Text>
                        <Text className="text-slate-400 text-xs text-center mb-8 px-4">
                            {isSettingPinCode 
                                ? "Définissez un code de 4 à 8 chiffres pour protéger vos réflexions." 
                                : "Saisissez votre code PIN de sécurité pour déverrouiller cette note."}
                        </Text>

                        {/* PIN dots */}
                        <View className="flex-row gap-3 mb-10 flex-wrap justify-center">
                            {Array.from({ length: Math.max(4, pinInput.length) }).map((_, i) => (
                                <View 
                                    key={i} 
                                    className={cn(
                                        "w-5 h-5 rounded-full border-2", 
                                        pinInput.length > i 
                                            ? "bg-amber-500 border-amber-500" 
                                            : "border-slate-600 bg-transparent"
                                    )} 
                                />
                            ))}
                        </View>

                        {/* Numeric Keyboard */}
                        <View className="w-full gap-4 mb-6">
                            {[[1, 2, 3], [4, 5, 6], [7, 8, 9]].map((row, idx) => (
                                <View key={idx} className="flex-row justify-between gap-4">
                                    {row.map(num => (
                                        <TouchableOpacity 
                                            key={num} 
                                            onPress={() => pinInput.length < 8 && setPinInput(prev => prev + num)}
                                            className="flex-1 h-16 bg-white/5 rounded-2xl items-center justify-center active:bg-white/10"
                                        >
                                            <Text className="text-white text-xl font-bold">{num}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))}
                            <View className="flex-row justify-between gap-4">
                                <TouchableOpacity 
                                    onPress={() => { setIsPinCodeModalVisible(false); setLockedNoteToUnlock(null); setLockedNoteToDelete(null); }}
                                    className="flex-1 h-16 rounded-2xl items-center justify-center"
                                >
                                    <Text className="text-slate-500 font-bold text-sm">Annuler</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => pinInput.length < 8 && setPinInput(prev => prev + "0")}
                                    className="flex-1 h-16 bg-white/5 rounded-2xl items-center justify-center active:bg-white/10"
                                >
                                    <Text className="text-white text-xl font-bold">0</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => setPinInput(prev => prev.slice(0, -1))}
                                    className="flex-1 h-16 rounded-2xl items-center justify-center"
                                >
                                    <Text className="text-amber-500 font-bold text-sm">Effacer</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {pinInput.length >= 4 && (
                            <TouchableOpacity 
                                onPress={handleSubmitPin}
                                className="w-full bg-amber-500 p-5 rounded-3xl items-center justify-center shadow-lg shadow-amber-500/20 mt-2"
                            >
                                <Text className="text-slate-950 font-bold text-base">Confirmer</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Change PIN Modal */}
            <Modal visible={isChangePinModalVisible} transparent animationType="fade" statusBarTranslucent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                    <View className="flex-1 bg-black/60 justify-center px-6">
                        <View className="bg-[#1c2128] border border-white/10 rounded-[32px] p-6 shadow-2xl">
                            <Text className="text-white font-bold text-lg mb-2" style={{ fontFamily: 'Lexend_700Bold' }}>Sécurité du Journal</Text>
                            <Text className="text-slate-400 text-xs mb-6">Ce code unique protège vos notes verrouillées.</Text>
                            
                            {pinCode ? (
                                <View className="mb-4">
                                    <Text className="text-slate-400 text-xs mb-2">Ancien code PIN :</Text>
                                    <TextInput
                                        className="bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold tracking-widest text-center text-xl"
                                        value={changePinOldInput}
                                        onChangeText={setChangePinOldInput}
                                        placeholder="Ancien PIN"
                                        placeholderTextColor="#475569"
                                        keyboardType="numeric"
                                        secureTextEntry
                                        maxLength={8}
                                    />
                                </View>
                            ) : null}

                            <View className="mb-6">
                                <Text className="text-slate-400 text-xs mb-2">Nouveau code PIN :</Text>
                                <TextInput
                                    className="bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold tracking-widest text-center text-xl"
                                    value={changePinNewInput}
                                    onChangeText={setChangePinNewInput}
                                    placeholder="Nouveau PIN"
                                    placeholderTextColor="#475569"
                                    keyboardType="numeric"
                                    secureTextEntry
                                    maxLength={8}
                                />
                            </View>

                            <View className="flex-row gap-3">
                                <TouchableOpacity 
                                    onPress={() => setIsChangePinModalVisible(false)} 
                                    className="flex-1 p-4 rounded-2xl border border-white/10 items-center justify-center"
                                >
                                    <Text className="text-slate-400 font-medium">{t('cancel') || 'Annuler'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={async () => {
                                        if (pinCode && changePinOldInput !== pinCode) {
                                            setAlertConfig({ visible: true, title: "Erreur", message: "L'ancien code PIN est incorrect.", type: 'error' });
                                            return;
                                        }
                                        if (changePinNewInput.length < 4) {
                                            setAlertConfig({ visible: true, title: "Code trop court", message: "Le code PIN doit comporter au moins 4 chiffres.", type: 'error' });
                                            return;
                                        }
                                        setPinCode(changePinNewInput);
                                        await AsyncStorage.setItem('adventools_note_lock_pin', changePinNewInput);
                                        setIsChangePinModalVisible(false);
                                        setAlertConfig({ visible: true, title: "Code PIN modifié", message: "Le code PIN a été mis à jour avec succès.", type: 'success' });
                                    }} 
                                    className="flex-1 p-4 rounded-2xl bg-amber-500 items-center justify-center"
                                >
                                    <Text className="text-white font-bold">{t('save') || 'Enregistrer'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}
