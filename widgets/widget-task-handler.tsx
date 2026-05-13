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
  let verse = "Ouvrez l'application pour charger le verset du jour.";
  let reference = 'Adventools';

  try {
    const data = await getMofonainaForDate(new Date());
    if (data && data.lohateny_andro) {
      title = data.lohateny_andro;
      verse = data.andininy_soratra_masina;
      reference = data.toerana_soratra_masina;
    }
  } catch (error) {
    console.error('[Widget] Mofonaina fetch error:', error);
  }

  props.renderWidget(<MofonainaWidget title={title} verse={verse} reference={reference} />);
}

async function renderLesona(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  let title = 'Leçon de la semaine';
  let lessonNumber = '';
  let category = 'École du Sabbat';
  let weekRange = '';
  let days: any[] = [];
  let coverImage = '';

  try {
    const savedLang = await AsyncStorage.getItem('adventools_ss_selected_lang') ?? 'fr';
    const edsClass = await AsyncStorage.getItem('profile_eds_class') ?? 'Lesona Lehibe (+ 35 taona)';
    const classInfo = CLASS_TO_API_ID[edsClass] ?? CLASS_TO_API_ID['Lesona Lehibe (+ 35 taona)'];
    category = classInfo.label;

    const cacheKey = `adventools_ss_data_${savedLang}`;
    let cached = await AsyncStorage.getItem(cacheKey);
    let quarterlies: any[] = [];
    
    if (cached) {
      quarterlies = JSON.parse(cached);
    } else {
      // Fetch fresh index if cache is empty
      const subdomain = savedLang === 'en' ? 'absg' : 'inverse';
      const url = `https://${subdomain}.sspmadventist.org/api/v3/${savedLang}/ss/index.json`;
      const res = await fetch(url).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data.groups) {
          data.groups.forEach((g: any) => {
             if (g.resources) quarterlies.push(...g.resources);
          });
        } else if (Array.isArray(data)) {
          quarterlies = data;
        }
        await AsyncStorage.setItem(cacheKey, JSON.stringify(quarterlies));
      }
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
        const lUrl = `https://${preferredQuarterly.index.includes('inverse') || preferredQuarterly.id.includes('-cq') ? 'inverse' : 'absg'}.sspmadventist.org/api/v3/${preferredQuarterly.index}/index.json`;
        const qRes = await fetch(lUrl);
        const qData = await qRes.json();
        
        coverImage = qData.cover || (qData.covers ? qData.covers.portrait : '');

        const lessons = qData.lessons || qData.resources || [];
        let todayLesson = lessons.find((l: any) => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          return now >= start && now <= end;
        });
        
        if (!todayLesson && lessons.length > 0) todayLesson = lessons[0];

        if (todayLesson) {
          const lId = todayLesson.id.split('-').pop();
          const detailUrl = `https://${preferredQuarterly.index.includes('inverse') || preferredQuarterly.id.includes('-cq') ? 'inverse' : 'absg'}.sspmadventist.org/api/v3/${preferredQuarterly.index}/${lId}/index.json`;
          const detailRes = await fetch(detailUrl);
          const detailData = await detailRes.json();
          
          title = detailData.title || title;
          lessonNumber = lId;
          
          if (detailData.startDate && detailData.endDate) {
            weekRange = `${new Date(detailData.startDate).toLocaleDateString(savedLang)} - ${new Date(detailData.endDate).toLocaleDateString(savedLang)}`;
          }

          const langLabels: any = {
            mg: ['Sam', 'Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],
            fr: ['Sam', 'Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],
            en: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          };
          const labels = langLabels[savedLang] || langLabels.en;

          days = detailData.segments?.map((s: any, idx: number) => {
            const sDate = new Date(s.date);
            const isToday = sDate.getDate() === now.getDate() && sDate.getMonth() === now.getMonth();
            return {
              label: labels[idx] || '',
              date: sDate.getDate().toString().padStart(2, '0'),
              isToday,
              title: s.title
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
  let dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  let category = 'École du Sabbat';

  try {
    const savedLang = await AsyncStorage.getItem('adventools_ss_selected_lang') ?? 'fr';
    const edsClass = await AsyncStorage.getItem('profile_eds_class') ?? 'Lesona Lehibe (+ 35 taona)';
    const classInfo = CLASS_TO_API_ID[edsClass] ?? CLASS_TO_API_ID['Lesona Lehibe (+ 35 taona)'];
    category = classInfo.label;

    const cacheKey = `adventools_ss_data_${savedLang}`;
    let cached = await AsyncStorage.getItem(cacheKey);
    let quarterlies: any[] = [];
    
    if (cached) {
      quarterlies = JSON.parse(cached);
    } else {
      const subdomain = savedLang === 'en' ? 'absg' : 'inverse';
      const url = `https://${subdomain}.sspmadventist.org/api/v3/${savedLang}/ss/index.json`;
      const res = await fetch(url).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data.groups) {
          data.groups.forEach((g: any) => {
             if (g.resources) quarterlies.push(...g.resources);
          });
        } else if (Array.isArray(data)) {
          quarterlies = data;
        }
        await AsyncStorage.setItem(cacheKey, JSON.stringify(quarterlies));
      }
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
        const lUrl = `https://${preferredQuarterly.index.includes('inverse') || preferredQuarterly.id.includes('-cq') ? 'inverse' : 'absg'}.sspmadventist.org/api/v3/${preferredQuarterly.index}/index.json`;
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
          const detailUrl = `https://${preferredQuarterly.index.includes('inverse') || preferredQuarterly.id.includes('-cq') ? 'inverse' : 'absg'}.sspmadventist.org/api/v3/${preferredQuarterly.index}/${lId}/index.json`;
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
