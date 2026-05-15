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
// CONSTANTS — mirrors lesona.tsx
// ────────────────────────────────────────────────────────────────────────────────
const OFFLINE_LESSONS_PREFIX = 'adventools_ss_offline_';
const LESSONS_DIR = `${FileSystem.documentDirectory}ss_offline/`;

const CLASS_TO_API_ID: Record<string, { id: string; label: string }> = {
  'Lesona Lehibe (+ 35 taona)':           { id: 'adult',       label: 'Sekoly Sabata' },
  'Lesona Tanora zokiny (19-35 taona)':   { id: 'yad',         label: 'Tanora Zokiny' },
  'Lesona Zatovo (15-18 taona)':          { id: 'earliteen',   label: 'Zatovo' },
  'Lesona Mantoanto (13-14 taona)':       { id: 'earliteen',   label: 'Mantoanto' },
  'Lesona Tanora zandriny (10-12 taona)': { id: 'earliteen',   label: 'Tanora Zandriny' },
  'Lesona Ankizy (7-9 taona)':            { id: 'primary',     label: 'Ankizy' },
  'Lesona Kilonga (4-6 taona)':           { id: 'kindergarten',label: 'Kilonga' },
  'Lesona Zazakely (1-3 taona)':          { id: 'kindergarten',label: 'Zazakely' },
  'Lesona Zaza minono (0-12 volana)':     { id: 'kindergarten',label: 'Zaza minono' },
};

const MG_DAY_LABELS = ['Sab', 'Alah', 'Alat', 'Tal', 'Alar', 'Alak', 'Zom'];

// ────────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────────

/** Read a setting value from SQLite (mirrors getSetting in user-storage.ts) */
async function readSqliteSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await SQLite.openDatabaseAsync('adventools_user.db');
    const row: any = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
    if (row?.value) {
      try { return JSON.parse(row.value) as T; } catch { return row.value as unknown as T; }
    }
  } catch (e) {
    // DB may not exist yet on very first launch
  }
  return defaultValue;
}

/** Parse DD/MM/YYYY or ISO date strings (API returns both formats) */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  return new Date(dateStr);
}

// ────────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ────────────────────────────────────────────────────────────────────────────────
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetInfo.widgetName) {
    case 'Mofonaina':
      await renderMofonaina(props);
      break;
    case 'Lesona':
      await renderLesona(props);
      break;
    case 'LesonaAndro':
      await renderLesonaAndro(props);
      break;
    case 'Shortcuts':
      if (props.widgetAction !== 'WIDGET_DELETED') {
        props.renderWidget(<ShortcutsWidget />);
      }
      break;
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// MOFONAINA WIDGET
// ────────────────────────────────────────────────────────────────────────────────
async function renderMofonaina(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  let title = "Mofon'aina";
  let verse = "Sokafy ny fampiharana mba hamakiana ny tenin'Andriamanitra anio.";
  let reference = 'Adventools';

  try {
    // 1. Try cached local data first
    let data = await getMofonainaForDate(new Date());

    // 2. Fallback to direct API
    if (!data) {
      const res = await fetch('https://jasemsoftware.tech/api/v1/fiambenana?t=' + Date.now()).catch(() => null);
      if (res && res.ok) {
        const all = await res.json();
        const nowStr = new Date().toISOString().split('T')[0];
        data = all.find((m: any) => m.daty && m.daty.startsWith(nowStr)) || all[0];
      }
    }

    if (data) {
      title = data.lohateny_andro || title;
      verse = data.andininy_soratra_masina || verse;
      reference = data.toerana_soratra_masina || reference;
    }
  } catch (error) {
    console.error('[Widget] Mofonaina fetch error:', error);
  }

  const widgetWidth  = props.widgetInfo.width  > 0 ? props.widgetInfo.width  : 300;
  const widgetHeight = props.widgetInfo.height > 0 ? props.widgetInfo.height : 300;

  props.renderWidget(
    <MofonainaWidget
      title={title}
      verse={verse}
      reference={reference}
      widgetWidth={widgetWidth}
      widgetHeight={widgetHeight}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// LESONA WIDGET  (weekly overview)
// ────────────────────────────────────────────────────────────────────────────────
async function renderLesona(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  let title       = 'Lesona herinandro';
  let lessonNumber = '';
  let category    = 'Sekoly Sabata';
  let weekRange   = '';
  let days: any[] = [];
  let coverImage  = '';

  try {
    // ── 1. Read user class preference from SQLite ──────────────────────────
    const globalSettings = await readSqliteSetting<any>('app_global_settings', {});
    // The class is stored either at top-level or nested
    const edsClass: string =
      globalSettings?.edsClass ||
      globalSettings?.lessonCategory ||
      (await AsyncStorage.getItem('profile_eds_class')) ||
      'Lesona Lehibe (+ 35 taona)';

    const classInfo = CLASS_TO_API_ID[edsClass] ?? CLASS_TO_API_ID['Lesona Lehibe (+ 35 taona)'];
    category = classInfo.label;

    const lang = 'mg';
    const now  = new Date();
    now.setHours(0, 0, 0, 0);

    // ── 2. Load quarterly list from AsyncStorage cache ──────────────────────
    const storageKey = `adventools_ss_data_${lang}`;
    const cached     = await AsyncStorage.getItem(storageKey);
    let   quarterlies: any[] = cached ? JSON.parse(cached) : [];

    // Refresh from API if empty
    if (quarterlies.length === 0) {
      const url = `https://inverse.sspmadventist.org/api/v3/${lang}/ss/index.json?t=${Date.now()}`;
      const res = await fetch(url).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data.groups) {
          data.groups.forEach((g: any) => {
            if (g.resources) quarterlies.push(...g.resources);
          });
        }
        // Persist so next time we have a cache
        await AsyncStorage.setItem(storageKey, JSON.stringify(quarterlies));
      }
    }

    if (quarterlies.length === 0) throw new Error('No quarterly data');

    // ── 3. Find the currently active quarterly for this class ───────────────
    let preferredQuarterly = quarterlies.find((q: any) => {
      if (!q.startDate || !q.endDate) return false;
      const start = parseDate(q.startDate);
      const end   = parseDate(q.endDate);
      const isCurrent = now >= start && now <= end;
      const qId = (q.id || q.index || '').toLowerCase();

      if (classInfo.id === 'adult') {
        // Adult lesson: exclude youth/children IDs
        return isCurrent && !qId.includes('-yad-') && !qId.includes('-cq-')
          && !qId.includes('-earliteen-') && !qId.includes('-vanguard-')
          && !qId.includes('-primary-') && !qId.includes('-kindergarten-');
      }
      return isCurrent && qId.includes(`-${classInfo.id}-`);
    }) || quarterlies.find((q: any) => {
      if (!q.startDate || !q.endDate) return false;
      const start = parseDate(q.startDate);
      const end   = parseDate(q.endDate);
      return now >= start && now <= end;
    }) || quarterlies[0];

    if (!preferredQuarterly) throw new Error('No matching quarterly');

    const qId        = preferredQuarterly.id;
    const downloadId = `${lang}_${qId}`;

    // ── 4. Try local offline file first (what the user downloaded) ──────────
    const offlineFilePath = `${LESSONS_DIR}${downloadId}.json`;
    const offlineInfo     = await FileSystem.getInfoAsync(offlineFilePath).catch(() => null);
    let   quarterlyDetail: any = null;

    if (offlineInfo?.exists) {
      // User has downloaded this quarterly — use local data!
      const rawOffline = await FileSystem.readAsStringAsync(offlineFilePath);
      const allLessons: Record<string, any> = JSON.parse(rawOffline);

      // Get quarterly metadata from AsyncStorage cache
      const detailCacheKey = `adventools_ss_q_detail_${downloadId}`;
      const detailCached   = await AsyncStorage.getItem(detailCacheKey);
      quarterlyDetail = detailCached ? JSON.parse(detailCached) : null;

      if (quarterlyDetail) {
        coverImage = quarterlyDetail.covers?.portrait || quarterlyDetail.cover || '';
        const lessons: any[] = quarterlyDetail.lessons || [];

        // Find the current week's lesson
        const todayLesson = lessons.find((l: any) => {
          if (!l.startDate || !l.endDate) return false;
          const s = parseDate(l.startDate);
          const e = parseDate(l.endDate);
          e.setHours(23, 59, 59, 999);
          return now >= s && now <= e;
        }) || lessons[0];

        if (todayLesson) {
          const lId = (todayLesson.id || '').split('-').pop() || '01';
          lessonNumber = lId;

          // Get lesson content from the offline file
          const offlineLessonKey = `${OFFLINE_LESSONS_PREFIX}${lang}_${qId}_${lId}.json`;
          const lessonData: any = allLessons[lId] || allLessons[offlineLessonKey] || null;

          if (lessonData) {
            title     = lessonData.title || todayLesson.title || title;
            coverImage = lessonData.cover || coverImage;

            if (lessonData.startDate && lessonData.endDate) {
              const s = parseDate(lessonData.startDate);
              const e = parseDate(lessonData.endDate);
              weekRange = `${s.getDate()}/${s.getMonth()+1} - ${e.getDate()}/${e.getMonth()+1}`;
            }

            const segments: any[] = lessonData.segments || lessonData.days || [];
            days = segments.map((s: any, idx: number) => {
              const sDate   = s.date ? parseDate(s.date) : now;
              const isToday = sDate.getDate() === now.getDate() && sDate.getMonth() === now.getMonth();
              return {
                label:   MG_DAY_LABELS[idx] || `D${idx+1}`,
                date:    s.date ? sDate.getDate().toString().padStart(2,'0') : '--',
                isToday,
                title:   s.title || s.name || `Andro ${idx+1}`,
              };
            }).slice(0, 7);
          } else {
            // Offline file exists but lesson not found — use lesson metadata
            title = todayLesson.title || title;
          }
        }
      }
    }

    // ── 5. Fallback: fetch from API if no offline data ─────────────────────
    if (!quarterlyDetail) {
      const lUrl  = `https://inverse.sspmadventist.org/api/v3/${preferredQuarterly.index}/index.json`;
      const qRes  = await fetch(lUrl).catch(() => null);
      if (qRes && qRes.ok) {
        const qData = await qRes.json();
        coverImage  = qData.covers?.portrait || qData.cover || '';
        const lessons: any[] = qData.lessons || qData.resources || [];

        const todayLesson = lessons.find((l: any) => {
          if (!l.startDate || !l.endDate) return false;
          const s = parseDate(l.startDate);
          const e = parseDate(l.endDate);
          e.setHours(23, 59, 59, 999);
          return now >= s && now <= e;
        }) || lessons[0];

        if (todayLesson) {
          if (todayLesson.cover) coverImage = todayLesson.cover;
          const lId = (todayLesson.id || '').split('-').pop() || '01';
          lessonNumber = lId;

          const detailUrl = `https://inverse.sspmadventist.org/api/v3/${preferredQuarterly.index}/${lId}/index.json`;
          const detailRes = await fetch(detailUrl).catch(() => null);
          if (detailRes && detailRes.ok) {
            const detailData = await detailRes.json();
            title      = detailData.title || todayLesson.title || title;
            coverImage = detailData.cover || todayLesson.cover || coverImage;

            if (detailData.startDate && detailData.endDate) {
              const s = parseDate(detailData.startDate);
              const e = parseDate(detailData.endDate);
              weekRange = `${s.getDate()}/${s.getMonth()+1} - ${e.getDate()}/${e.getMonth()+1}`;
            }

            const segments: any[] = detailData.segments || detailData.days || [];
            days = segments.map((s: any, idx: number) => {
              const sDate   = s.date ? parseDate(s.date) : now;
              const isToday = sDate.getDate() === now.getDate() && sDate.getMonth() === now.getMonth();
              return {
                label:   MG_DAY_LABELS[idx] || `D${idx+1}`,
                date:    s.date ? sDate.getDate().toString().padStart(2,'0') : '--',
                isToday,
                title:   s.title || s.name || `Andro ${idx+1}`,
              };
            }).slice(0, 7);
          }
        }
      }
    }
  } catch (error) {
    console.error('[Widget] Lesona fetch error:', error);
  }

  props.renderWidget(
    <LesonaWidget
      title={title}
      lessonNumber={lessonNumber}
      category={category}
      weekRange={weekRange}
      days={days}
      coverImage={coverImage}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// LESONA ANDRO WIDGET  (today's lesson only)
// ────────────────────────────────────────────────────────────────────────────────
async function renderLesonaAndro(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  let title    = "Lesona anio";
  let dateStr  = new Date().toLocaleDateString('mg-MG', { weekday: 'long', day: 'numeric', month: 'long' });
  let category = 'Sekoly Sabata';

  try {
    const globalSettings = await readSqliteSetting<any>('app_global_settings', {});
    const edsClass: string =
      globalSettings?.edsClass ||
      globalSettings?.lessonCategory ||
      (await AsyncStorage.getItem('profile_eds_class')) ||
      'Lesona Lehibe (+ 35 taona)';

    const classInfo = CLASS_TO_API_ID[edsClass] ?? CLASS_TO_API_ID['Lesona Lehibe (+ 35 taona)'];
    category = classInfo.label;

    const lang = 'mg';
    const now  = new Date();
    now.setHours(0, 0, 0, 0);

    const storageKey  = `adventools_ss_data_${lang}`;
    const cached      = await AsyncStorage.getItem(storageKey);
    let   quarterlies = cached ? JSON.parse(cached) : [];

    if (quarterlies.length === 0) {
      const res = await fetch(`https://inverse.sspmadventist.org/api/v3/${lang}/ss/index.json`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data.groups) data.groups.forEach((g: any) => { if (g.resources) quarterlies.push(...g.resources); });
        await AsyncStorage.setItem(storageKey, JSON.stringify(quarterlies));
      }
    }

    let preferredQuarterly = quarterlies.find((q: any) => {
      if (!q.startDate || !q.endDate) return false;
      const start = parseDate(q.startDate);
      const end   = parseDate(q.endDate);
      const isCurrent = now >= start && now <= end;
      const qId = (q.id || q.index || '').toLowerCase();
      if (classInfo.id === 'adult') return isCurrent && !qId.includes('-yad-') && !qId.includes('-cq-');
      return isCurrent && qId.includes(`-${classInfo.id}-`);
    }) || quarterlies.find((q: any) => {
      if (!q.startDate || !q.endDate) return false;
      return now >= parseDate(q.startDate) && now <= parseDate(q.endDate);
    }) || quarterlies[0];

    if (preferredQuarterly) {
      const qId        = preferredQuarterly.id;
      const downloadId = `${lang}_${qId}`;
      const offlinePath = `${LESSONS_DIR}${downloadId}.json`;
      const offlineInfo = await FileSystem.getInfoAsync(offlinePath).catch(() => null);

      let todaySegmentTitle: string | null = null;

      if (offlineInfo?.exists) {
        const detailCached = await AsyncStorage.getItem(`adventools_ss_q_detail_${downloadId}`);
        if (detailCached) {
          const qDetail = JSON.parse(detailCached);
          const lessons: any[] = qDetail.lessons || [];
          const todayLesson = lessons.find((l: any) => {
            if (!l.startDate || !l.endDate) return false;
            const s = parseDate(l.startDate); const e = parseDate(l.endDate);
            e.setHours(23,59,59,999);
            return now >= s && now <= e;
          }) || lessons[0];

          if (todayLesson) {
            const lId = (todayLesson.id || '').split('-').pop() || '01';
            const rawOffline = await FileSystem.readAsStringAsync(offlinePath);
            const allLessons: any = JSON.parse(rawOffline);
            const lessonData = allLessons[lId];
            if (lessonData?.segments) {
              const todaySeg = lessonData.segments.find((s: any) => {
                if (!s.date) return false;
                const d = parseDate(s.date);
                return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
              });
              todaySegmentTitle = todaySeg?.title || lessonData.title;
            }
          }
        }
      }

      if (!todaySegmentTitle) {
        // Fetch from API
        const qRes = await fetch(`https://inverse.sspmadventist.org/api/v3/${preferredQuarterly.index}/index.json`).catch(() => null);
        if (qRes && qRes.ok) {
          const qData  = await qRes.json();
          const lessons: any[] = qData.lessons || [];
          const todayLesson = lessons.find((l: any) => {
            if (!l.startDate || !l.endDate) return false;
            const s = parseDate(l.startDate); const e = parseDate(l.endDate);
            e.setHours(23,59,59,999);
            return now >= s && now <= e;
          }) || lessons[0];
          if (todayLesson) {
            const lId = (todayLesson.id || '').split('-').pop();
            const dRes = await fetch(`https://inverse.sspmadventist.org/api/v3/${preferredQuarterly.index}/${lId}/index.json`).catch(() => null);
            if (dRes && dRes.ok) {
              const dData = await dRes.json();
              const todaySeg = (dData.segments || []).find((s: any) => {
                if (!s.date) return false;
                const d = parseDate(s.date);
                return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
              });
              todaySegmentTitle = todaySeg?.title || dData.title;
            }
          }
        }
      }

      if (todaySegmentTitle) title = todaySegmentTitle;
    }
  } catch (error) {
    console.error('[Widget] LesonaAndro fetch error:', error);
  }

  props.renderWidget(<LesonaAndroWidget title={title} date={dateStr} category={category} />);
}
