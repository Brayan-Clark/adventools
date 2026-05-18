import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { MofonainaWidget } from './MofonainaWidget';
import { LesonaWidget } from './LesonaWidget';
import { LesonaAndroWidget } from './LesonaAndroWidget';
import { ShortcutsWidget } from './ShortcutsWidget';
import { getMofonainaForDate } from '../lib/mofonaina';
import * as SQLite from 'expo-sqlite';

// ────────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────────────────────────
const OFFLINE_LESSONS_PREFIX = 'adventools_ss_offline_';
const LESSONS_DIR = `${FileSystem.documentDirectory}ss_offline/`;

const MG_DAY_LABELS = ['Alah', 'Alat', 'Tal', 'Alar', 'Alak', 'Zom', 'Sab'];

// Class label → API quarterly ID suffix pattern
// Based on real API data:
//   Lesona Lehibe     → IDs like "mg-ss-2026-02"        (no suffix)
//   Tanora Zokiny     → IDs like "mg-ss-2026-02-cq"     (ends with -cq)
const CLASS_TO_SUFFIX: Record<string, { suffix: string; label: string }> = {
  'Lesona Lehibe (+ 35 taona)':           { suffix: 'adult', label: 'Sekoly Sabata' },
  'Lesona Tanora zokiny (19-35 taona)':   { suffix: 'cq',    label: 'Tanora Zokiny' },
  'Lesona Zatovo (15-18 taona)':          { suffix: 'earliteen', label: 'Zatovo' },
  'Lesona Mantoanto (13-14 taona)':       { suffix: 'earliteen', label: 'Mantoanto' },
  'Lesona Tanora zandriny (10-12 taona)': { suffix: 'earliteen', label: 'Tanora Zandriny' },
  'Lesona Ankizy (7-9 taona)':            { suffix: 'primary',   label: 'Ankizy' },
  'Lesona Kilonga (4-6 taona)':           { suffix: 'kindergarten', label: 'Kilonga' },
  'Lesona Zazakely (1-3 taona)':          { suffix: 'kindergarten', label: 'Zazakely' },
  'Lesona Zaza minono (0-12 volana)':     { suffix: 'kindergarten', label: 'Zaza minono' },
};

// ────────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────────

/** Read a value from the SQLite settings table (mirrors getSetting in user-storage.ts) */
async function readSqliteSetting<T>(key: string, defaultValue: T): Promise<T> {
  let db: SQLite.SQLiteDatabase | null = null;
  try {
    db = await SQLite.openDatabaseAsync('adventools_user.db');
    // Enable WAL mode to allow concurrent read/write operations from both the app and the widget
    await db.execAsync("PRAGMA journal_mode = WAL;");
    const row: any = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
    if (row?.value) {
      try { return JSON.parse(row.value) as T; } catch { return row.value as unknown as T; }
    }
  } catch (_) { /* DB may not exist on very first run */ } finally {
    if (db) {
      try {
        await db.closeAsync();
      } catch (e) {
        console.error('[Widget] Failed to close SQLite database:', e);
      }
    }
  }
  return defaultValue;
}

/** Parse DD/MM/YYYY OR ISO date strings */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  return new Date(dateStr);
}

/**
 * Calculate the current week number (1-based) within a quarterly,
 * given the quarterly's start date. Each week starts on Saturday.
 */
function calcWeekNumber(quarterlyStartDate: string, now: Date): number {
  const start = parseDate(quarterlyStartDate);
  // Normalize both to midnight
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const diffMs   = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 1;
  return Math.floor(diffDays / 7) + 1;
}

/** Match a quarterly from the list based on the user's class selection */
function matchQuarterly(quarterlies: any[], suffix: string, now: Date): any | null {
  // Find current quarterlies (date range covers today)
  const current = quarterlies.filter((q: any) => {
    if (!q.startDate || !q.endDate) return false;
    const s = parseDate(q.startDate);
    const e = parseDate(q.endDate);
    e.setHours(23, 59, 59, 999);
    return now >= s && now <= e;
  });

  if (current.length === 0) return quarterlies[0] || null;

  const qId = (q: any) => (q.id || q.index || '').toLowerCase();

  if (suffix === 'adult') {
    // Adult: IDs that have NO special suffix (-cq, -earliteen, -primary, -kindergarten)
    return (
      current.find((q: any) => {
        const id = qId(q);
        return !id.endsWith('-cq') && !id.includes('-earliteen')
          && !id.includes('-primary') && !id.includes('-kindergarten')
          && !id.includes('-yad');
      }) || current[0]
    );
  }

  if (suffix === 'cq') {
    // Tanora Zokiny: IDs that END with -cq
    return current.find((q: any) => qId(q).endsWith('-cq')) || current[0];
  }

  // Other classes: look for suffix in the ID
  return (
    current.find((q: any) => qId(q).includes(`-${suffix}`)) || current[0]
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ────────────────────────────────────────────────────────────────────────────────
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetInfo.widgetName) {
    case 'Mofonaina':   await renderMofonaina(props);   break;
    case 'Lesona':      await renderLesona(props);      break;
    case 'LesonaAndro': await renderLesonaAndro(props); break;
    case 'Shortcuts':
      if (props.widgetAction !== 'WIDGET_DELETED') {
        props.renderWidget(<ShortcutsWidget />);
      }
      break;
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// MOFONAINA
// ────────────────────────────────────────────────────────────────────────────────
async function renderMofonaina(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  let title     = "Mofon'aina";
  let verse     = "Sokafy ny fampiharana mba hamakiana ny tenin'Andriamanitra anio.";
  let reference = 'Adventools';

  try {
    let data = await getMofonainaForDate(new Date());
    if (!data) {
      const res = await fetch('https://jasemsoftware.tech/api/v1/fiambenana?t=' + Date.now()).catch(() => null);
      if (res?.ok) {
        const all   = await res.json();
        const today = new Date().toISOString().split('T')[0];
        data = all.find((m: any) => m.daty?.startsWith(today)) || all[0];
      }
    }
    if (data) {
      title     = data.lohateny_andro            || title;
      verse     = data.andininy_soratra_masina   || verse;
      reference = data.toerana_soratra_masina    || reference;
    }
  } catch (e) {
    console.error('[Widget] Mofonaina error:', e);
  }

  const widgetWidth  = props.widgetInfo.width  > 0 ? props.widgetInfo.width  : 300;
  const widgetHeight = props.widgetInfo.height > 0 ? props.widgetInfo.height : 300;

  props.renderWidget(
    <MofonainaWidget
      title={title} verse={verse} reference={reference}
      widgetWidth={widgetWidth} widgetHeight={widgetHeight}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// LESONA  (weekly overview)
// ────────────────────────────────────────────────────────────────────────────────
async function renderLesona(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  let quarterlyTitle = 'Sekoly Sabata';
  let lessonTitle    = 'Lesona herinandro';
  let lessonNumber   = '';
  let category       = 'Sekoly Sabata';
  let weekRange      = '';
  let days: any[]    = [];
  let coverImage     = '';

  try {
    // 1. Read class preference from SQLite (where settings are stored after migration)
    const edsClass: string =
      (await readSqliteSetting<string>('profile_eds_class', '')) ||
      (await AsyncStorage.getItem('profile_eds_class')) ||
      'Lesona Lehibe (+ 35 taona)';

    const classInfo = CLASS_TO_SUFFIX[edsClass] ?? CLASS_TO_SUFFIX['Lesona Lehibe (+ 35 taona)'];
    category = classInfo.label;

    const lang = 'mg';
    const now  = new Date(); now.setHours(0, 0, 0, 0);

    // 2. Load quarterly list
    const storageKey  = `adventools_ss_data_${lang}`;
    const cached      = await AsyncStorage.getItem(storageKey);
    let   quarterlies: any[] = cached ? JSON.parse(cached) : [];

    if (quarterlies.length === 0) {
      const res = await fetch(`https://inverse.sspmadventist.org/api/v3/${lang}/ss/index.json`).catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        (data.groups || []).forEach((g: any) => {
          if (g.resources) quarterlies.push(...g.resources);
        });
        await AsyncStorage.setItem(storageKey, JSON.stringify(quarterlies));
      }
    }

    if (!quarterlies.length) throw new Error('No quarterlies');

    // 3. Match the right quarterly for the user's class
    const pq = matchQuarterly(quarterlies, classInfo.suffix, now);
    if (!pq) throw new Error('No matching quarterly');

    // Cover from quarterly list item
    coverImage = pq.covers?.portrait || pq.cover || '';

    const qId        = pq.id;
    const downloadId = `${lang}_${qId}`;

    // 4. Calculate the current lesson number from the quarterly start date
    const weekNum     = calcWeekNumber(pq.startDate, now);
    const lessonId    = weekNum.toString().padStart(2, '0');
    lessonNumber      = lessonId;

    // 5a. Try offline file first
    const offlinePath = `${LESSONS_DIR}${downloadId}.json`;
    const offlineInfo = await FileSystem.getInfoAsync(offlinePath).catch(() => null);

    if (offlineInfo?.exists) {
      const raw         = await FileSystem.readAsStringAsync(offlinePath);
      const allLessons  = JSON.parse(raw);
      const lessonData  = allLessons[lessonId] || allLessons[weekNum.toString()];

      if (lessonData) {
        quarterlyTitle = pq.title || quarterlyTitle;
        lessonTitle    = lessonData.title || lessonTitle;
        coverImage     = lessonData.cover || coverImage;

        if (lessonData.startDate && lessonData.endDate) {
          const s = parseDate(lessonData.startDate);
          const e = parseDate(lessonData.endDate);
          weekRange = `${s.getDate()}/${s.getMonth()+1} – ${e.getDate()}/${e.getMonth()+1}`;
        }

        const segments: any[] = lessonData.segments || lessonData.days || [];
        days = segments.map((s: any, idx: number) => {
          const sDate   = s.date ? parseDate(s.date) : now;
          const isToday = sDate.getDate() === now.getDate() && sDate.getMonth() === now.getMonth();
          return {
            label:   s.date ? MG_DAY_LABELS[sDate.getDay()] : `D${idx+1}`,
            date:    s.date ? sDate.getDate().toString().padStart(2,'0') : '--',
            isToday,
            title:   s.title || s.name || `Andro ${idx+1}`,
          };
        }).slice(0, 7);
      }
    }

    // 5b. Fallback: fetch lesson detail from API
    if (!days.length) {
      const detailUrl = `https://inverse.sspmadventist.org/api/v3/${pq.index}/${lessonId}/index.json`;
      const dRes = await fetch(detailUrl).catch(() => null);
      if (dRes?.ok) {
        const d = await dRes.json();
        quarterlyTitle = pq.title || quarterlyTitle;
        lessonTitle    = d.title      || lessonTitle;
        coverImage     = d.cover      || coverImage;

        if (d.startDate && d.endDate) {
          const s = parseDate(d.startDate);
          const e = parseDate(d.endDate);
          weekRange = `${s.getDate()}/${s.getMonth()+1} – ${e.getDate()}/${e.getMonth()+1}`;
        }

        const segments: any[] = d.segments || d.days || [];
        days = segments.map((s: any, idx: number) => {
          const sDate   = s.date ? parseDate(s.date) : now;
          const isToday = sDate.getDate() === now.getDate() && sDate.getMonth() === now.getMonth();
          return {
            label:   s.date ? MG_DAY_LABELS[sDate.getDay()] : `D${idx+1}`,
            date:    s.date ? sDate.getDate().toString().padStart(2,'0') : '--',
            isToday,
            title:   s.title || s.name || `Andro ${idx+1}`,
          };
        }).slice(0, 7);
      }
    }
  } catch (e) {
    console.error('[Widget] Lesona error:', e);
  }

  props.renderWidget(
    <LesonaWidget
      quarterlyTitle={quarterlyTitle} lessonTitle={lessonTitle}
      lessonNumber={lessonNumber} category={category}
      weekRange={weekRange} days={days} coverImage={coverImage}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// LESONA ANDRO  (today only)
// ────────────────────────────────────────────────────────────────────────────────
async function renderLesonaAndro(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  let title    = 'Lesona anio';
  const dateStr = new Date().toLocaleDateString('mg-MG', { weekday: 'long', day: 'numeric', month: 'long' });
  let category = 'Sekoly Sabata';
  let coverImage = '';

  try {
    const edsClass: string =
      (await readSqliteSetting<string>('profile_eds_class', '')) ||
      (await AsyncStorage.getItem('profile_eds_class')) ||
      'Lesona Lehibe (+ 35 taona)';

    const classInfo = CLASS_TO_SUFFIX[edsClass] ?? CLASS_TO_SUFFIX['Lesona Lehibe (+ 35 taona)'];
    category = classInfo.label;

    const lang = 'mg';
    const now  = new Date(); now.setHours(0, 0, 0, 0);

    const cached      = await AsyncStorage.getItem(`adventools_ss_data_${lang}`);
    let   quarterlies = cached ? JSON.parse(cached) : [];

    const pq = matchQuarterly(quarterlies, classInfo.suffix, now);
    if (!pq) throw new Error('No quarterly');

    coverImage = pq.covers?.landscape || pq.cover || '';
    const weekNum  = calcWeekNumber(pq.startDate, now);
    const lessonId = weekNum.toString().padStart(2, '0');
    const downloadId = `${lang}_${pq.id}`;

    let todaySegTitle: string | null = null;

    // Try offline
    const offlinePath = `${LESSONS_DIR}${downloadId}.json`;
    const info = await FileSystem.getInfoAsync(offlinePath).catch(() => null);
    if (info?.exists) {
      const raw        = await FileSystem.readAsStringAsync(offlinePath);
      const allLessons = JSON.parse(raw);
      const lessonData = allLessons[lessonId] || allLessons[weekNum.toString()];
      if (lessonData?.segments) {
        const todaySeg = lessonData.segments.find((s: any) => {
          if (!s.date) return false;
          const d = parseDate(s.date);
          return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
        });
        todaySegTitle = todaySeg?.title || lessonData.title;
      }
    }

    // Fallback: API
    if (!todaySegTitle) {
      const dRes = await fetch(`https://inverse.sspmadventist.org/api/v3/${pq.index}/${lessonId}/index.json`).catch(() => null);
      if (dRes?.ok) {
        const d = await dRes.json();
        const todaySeg = (d.segments || []).find((s: any) => {
          if (!s.date) return false;
          const sd = parseDate(s.date);
          return sd.getDate() === now.getDate() && sd.getMonth() === now.getMonth();
        });
        todaySegTitle = todaySeg?.title || d.title;
      }
    }

    if (todaySegTitle) title = todaySegTitle;
  } catch (e) {
    console.error('[Widget] LesonaAndro error:', e);
  }

  props.renderWidget(<LesonaAndroWidget title={title} date={dateStr} category={category} coverImage={coverImage} />);
}
