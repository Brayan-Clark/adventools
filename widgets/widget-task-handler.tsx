import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { MofonainaWidget } from './MofonainaWidget';
import { LesonaWidget } from './LesonaWidget';
import { LesonaAndroWidget } from './LesonaAndroWidget';
import { ShortcutsWidget } from './ShortcutsWidget';
import { getMofonainaForDate } from '../lib/mofonaina';

const CLASS_TO_API_ID: Record<string, { id: string; label: string }> = {
  'Lesona Lehibe (+ 35 taona)':        { id: 'adult',      label: 'Adulte' },
  'Lesona Tanora zokiny (19-35 taona)': { id: 'yad',        label: 'Jeune Adulte' },
  'Lesona Zatovo (15-18 taona)':       { id: 'earliteen',  label: 'Adolescent' },
  'Lesona Mantoanto (13-14 taona)':     { id: 'earliteen',  label: 'Mantoanto' }, // Map to earliteen if no specific
  'Lesona Tanora zandriny (10-12 taona)': { id: 'earliteen', label: 'Tanora Zandriny' },
  'Lesona Ankizy (7-9 taona)':         { id: 'primary',    label: 'Ankizy' },
  'Lesona Kilonga (4-6 taona)':        { id: 'kindergarten', label: 'Kilonga' },
  'Lesona Zazakely (1-3 taona)':       { id: 'kindergarten', label: 'Zazakely' },
  'Lesona Zaza minono (0-12 volana)':   { id: 'kindergarten', label: 'Zaza minono' },
  // Fallback for French labels if any
  'Adulte':         { id: 'adult',      label: 'Adulte' },
  'Jeune Adulte':   { id: 'yad',        label: 'Jeune Adulte' },
};

function getTodayLessonNumber(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const daysSinceSaturday = (dayOfWeek + 1) % 7;
  const weekOfMonth = Math.floor((today.getDate() - 1) / 7);
  return String(weekOfMonth + 1).padStart(2, '0');
}

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

async function renderMofonaina(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  let title = "Mofon'aina";
  let verse = "Sokafy ny fampiharana mba hamakiana ny tenin'Andriamanitra anio.";
  let reference = 'Adventools';

  try {
    // 1. Try Cache first
    let data = await getMofonainaForDate(new Date());
    
    // 2. If no cache, try direct API fetch (fallback for first run)
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

  props.renderWidget(<MofonainaWidget title={title} verse={verse} reference={reference} />);
}

async function renderLesona(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  let title = 'Lesona herinandro';
  let lessonNumber = '';
  let category = 'Sekoly Sabata';
  let weekRange = '';
  let days: any[] = [];
  let coverImage = '';

  try {
    const savedLang = 'mg'; // FORCE Malagasy
    const edsClass = await AsyncStorage.getItem('profile_eds_class') ?? 'Lesona Lehibe (+ 35 taona)';
    const classInfo = CLASS_TO_API_ID[edsClass] ?? CLASS_TO_API_ID['Lesona Lehibe (+ 35 taona)'];
    category = classInfo.label;

    const cacheKey = `adventools_ss_data_${savedLang}`;
    let cached = await AsyncStorage.getItem(cacheKey);
    let quarterlies: any[] = [];
    
    // Fetch fresh index for Malagasy
    const url = `https://inverse.sspmadventist.org/api/v3/mg/ss/index.json?t=${Date.now()}`;
    const res = await fetch(url).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data.groups) {
        data.groups.forEach((g: any) => {
           if (g.resources) quarterlies.push(...g.resources);
        });
      }
    } else if (cached) {
      quarterlies = JSON.parse(cached);
    }

    if (quarterlies.length > 0) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      let preferredQuarterly = quarterlies.find((q: any) => {
        const start = new Date(q.startDate);
        const end = new Date(q.endDate);
        const isCurrent = now >= start && now <= end;
        const qId = q.id || q.index || '';
        if (classInfo.id === 'adult') {
          return isCurrent && !qId.includes('-yad-') && !qId.includes('-earliteen-') && !qId.includes('-vanguard-') && !qId.includes('-cq-');
        }
        return isCurrent && qId.includes(`-${classInfo.id}-`);
      }) || quarterlies.find((q: any) => {
        const start = new Date(q.startDate);
        const end = new Date(q.endDate);
        return now >= start && now <= end;
      }) || quarterlies[0];

      if (preferredQuarterly) {
        const lUrl = `https://inverse.sspmadventist.org/api/v3/${preferredQuarterly.index}/index.json`;
        const qRes = await fetch(lUrl);
        const qData = await qRes.json();
        
        coverImage = qData.cover || (qData.covers ? qData.covers.portrait : '');

        const lessons = qData.lessons || qData.resources || [];
        let todayLesson = lessons.find((l: any) => {
          if (!l.startDate || !l.endDate) return false;
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          // End of the week is actually Friday/Saturday, extend by 1 day just in case
          end.setHours(23, 59, 59, 999);
          return now >= start && now <= end;
        }) || lessons[0];

        if (todayLesson) {
          if (todayLesson.cover) coverImage = todayLesson.cover;
          const lId = todayLesson.id.split('-').pop();
          const detailUrl = `https://inverse.sspmadventist.org/api/v3/${preferredQuarterly.index}/${lId}/index.json`;
          const detailRes = await fetch(detailUrl);
          const detailData = await detailRes.json();
          
          title = detailData.title || todayLesson.title || detailData.name || 'Lesona herinandro';
          lessonNumber = lId;
          
          if (detailData.cover) coverImage = detailData.cover;
          else if (todayLesson.cover) coverImage = todayLesson.cover;
          
          if (detailData.startDate && detailData.endDate) {
            weekRange = `${new Date(detailData.startDate).toLocaleDateString('mg-MG')} - ${new Date(detailData.endDate).toLocaleDateString('mg-MG')}`;
          }

          const mgLabels = ['Sab', 'Alah', 'Alat', 'Tal', 'Alar', 'Alak', 'Zom'];
          const availableSegments = detailData.segments || detailData.days || detailData.lessons || [];
          
          days = availableSegments.map((s: any, idx: number) => {
            const sDate = s.date ? new Date(s.date) : new Date();
            const isToday = sDate.getDate() === now.getDate() && sDate.getMonth() === now.getMonth();
            const rawTitle = s.title || s.name || `Andro ${idx + 1}`;
            return {
              label: mgLabels[idx] || rawTitle.substring(0, 3) || '',
              date: s.date ? sDate.getDate().toString().padStart(2, '0') : '--',
              isToday,
              title: rawTitle
            };
          }).slice(0, 7) || [];
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

async function renderLesonaAndro(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  let title = 'Chargement...';
  let dateStr = new Date().toLocaleDateString('mg-MG', { weekday: 'long', day: 'numeric', month: 'long' });
  let category = 'Sekoly Sabata';

  try {
    const savedLang = 'mg'; // FORCE Malagasy as requested
    const edsClass = await AsyncStorage.getItem('profile_eds_class') ?? 'Lesona Lehibe (+ 35 taona)';
    const classInfo = CLASS_TO_API_ID[edsClass] ?? CLASS_TO_API_ID['Lesona Lehibe (+ 35 taona)'];
    category = classInfo.label;

    const cacheKey = `adventools_ss_data_${savedLang}`;
    let cached = await AsyncStorage.getItem(cacheKey);
    let quarterlies: any[] = [];
    
    const url = `https://inverse.sspmadventist.org/api/v3/mg/ss/index.json`;
    const res = await fetch(url).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data.groups) {
        data.groups.forEach((g: any) => {
           if (g.resources) quarterlies.push(...g.resources);
        });
      }
      await AsyncStorage.setItem(cacheKey, JSON.stringify(quarterlies));
    } else if (cached) {
      quarterlies = JSON.parse(cached);
    }

    if (quarterlies.length > 0) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      let preferredQuarterly = quarterlies.find((q: any) => {
        const start = new Date(q.startDate);
        const end = new Date(q.endDate);
        const isCurrent = now >= start && now <= end;
        const qId = q.id || q.index || '';
        
        if (classInfo.id === 'adult') {
          return isCurrent && !qId.includes('-yad-') && !qId.includes('-earliteen-') && !qId.includes('-vanguard-') && !qId.includes('-cq-');
        }
        return isCurrent && qId.includes(`-${classInfo.id}-`);
      });

      if (!preferredQuarterly) {
        preferredQuarterly = quarterlies.find((q: any) => {
          const start = new Date(q.startDate);
          const end = new Date(q.endDate);
          return now >= start && now <= end;
        });
      }

      preferredQuarterly = preferredQuarterly || quarterlies[0];

      if (preferredQuarterly) {
        const lUrl = `https://inverse.sspmadventist.org/api/v3/${preferredQuarterly.index}/index.json`;
        const qRes = await fetch(lUrl);
        const qData = await qRes.json();
        
        const lessons = qData.lessons || qData.resources || [];
        let todayLesson = lessons.find((l: any) => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          return now >= start && now <= end;
        });
        
        if (!todayLesson && lessons.length > 0) todayLesson = lessons[0];

        if (todayLesson) {
          const lId = todayLesson.id.split('-').pop();
          const detailUrl = `https://inverse.sspmadventist.org/api/v3/${preferredQuarterly.index}/${lId}/index.json`;
          const detailRes = await fetch(detailUrl);
          const detailData = await detailRes.json();
          
          const todaySegment = detailData.segments?.find((s: any) => {
            const sDate = new Date(s.date);
            return sDate.getDate() === now.getDate() && sDate.getMonth() === now.getMonth();
          });

          if (todaySegment) {
            title = todaySegment.title;
          } else {
            title = detailData.title;
          }
        }
      }
    }
  } catch (error) {
    console.error('[Widget] LesonaAndro fetch error:', error);
  }

  props.renderWidget(
    <LesonaAndroWidget
      title={title}
      date={dateStr}
      category={category}
    />
  );
}
