import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { MofonainaWidget } from './MofonainaWidget';
import { LesonaWidget } from './LesonaWidget';
import { LesonaAndroWidget } from './LesonaAndroWidget';
import { ShortcutsWidget } from './ShortcutsWidget';
import { getMofonainaForDate } from '../lib/mofonaina';

const CLASS_TO_API_ID: Record<string, { id: string; label: string }> = {
  'Adulte':         { id: 'adult',      label: 'Adulte' },
  'Jeune Adulte':   { id: 'yad',        label: 'Jeune Adulte' },
  'Adolescent':     { id: 'earliteen',  label: 'Adolescent' },
  'Avant-garde':    { id: 'vanguard',   label: 'Avant-garde' },
  'Temps réel':     { id: 'real-time',  label: 'Temps réel' },
  'Auxiliaire':     { id: 'junior',     label: 'Auxiliaire' },
  'Primaire':       { id: 'primary',    label: 'Primaire' },
  'Jardin d\'enfants': { id: 'kindergarten', label: 'Jardin d\'enfants' },
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
    const edsClass = await AsyncStorage.getItem('profile_eds_class') ?? 'Adulte';
    const classInfo = CLASS_TO_API_ID[edsClass] ?? CLASS_TO_API_ID['Adulte'];
    category = classInfo.label;

    const cacheKey = `adventools_ss_data_${savedLang}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (cached) {
      const quarterlies = JSON.parse(cached);
      const now = new Date();
      const current = quarterlies.find((q: any) => {
        const start = new Date(q.startDate);
        const end = new Date(q.endDate);
        return now >= start && now <= end;
      }) ?? quarterlies[0];

      if (current) {
        // Filter by class if possible
        const preferredQuarterly = quarterlies.find((q: any) => {
          const start = new Date(q.startDate);
          const end = new Date(q.endDate);
          const isCurrent = now >= start && now <= end;
          
          if (classInfo.id === 'adult') {
            // Adults usually have standard IDs like 'fr-2024-02'
            return isCurrent && !q.id.includes('-yad-') && !q.id.includes('-earliteen-') && !q.id.includes('-vanguard-') && !q.id.includes('-cq-');
          }
          return isCurrent && q.id.includes(`-${classInfo.id}-`);
        }) ?? current;

        // Fetch lesson detail
        const lUrl = `https://${preferredQuarterly.index.includes('inverse') || preferredQuarterly.id.includes('-cq') ? 'inverse' : 'absg'}.sspmadventist.org/api/v3/${preferredQuarterly.index}/index.json`;
        const qRes = await fetch(lUrl);
        const qData = await qRes.json();
        
        coverImage = qData.cover || '';

        const todayLesson = qData.lessons?.find((l: any) => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          return now >= start && now <= end;
        });

        if (todayLesson) {
          const lId = todayLesson.id.split('-').pop();
          const detailUrl = `https://${qData.index.includes('inverse') || qData.id.includes('-cq') ? 'inverse' : 'absg'}.sspmadventist.org/api/v3/${qData.index}/${lId}/index.json`;
          const detailRes = await fetch(detailUrl);
          const detailData = await detailRes.json();
          
          title = detailData.title || title;
          lessonNumber = lId;
          
          if (detailData.startDate && detailData.endDate) {
            weekRange = `${new Date(detailData.startDate).toLocaleDateString(savedLang)} - ${new Date(detailData.endDate).toLocaleDateString(savedLang)}`;
          }

          // Build days list for widget
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
    const edsClass = await AsyncStorage.getItem('profile_eds_class') ?? 'Adulte';
    const classInfo = CLASS_TO_API_ID[edsClass] ?? CLASS_TO_API_ID['Adulte'];
    category = classInfo.label;

    const cacheKey = `adventools_ss_data_${savedLang}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (cached) {
      const quarterlies = JSON.parse(cached);
      const now = new Date();
      const current = quarterlies.find((q: any) => {
        const start = new Date(q.startDate);
        const end = new Date(q.endDate);
        return now >= start && now <= end;
      }) ?? quarterlies[0];

      if (current) {
        // Filter by class if possible
        const preferredQuarterly = quarterlies.find((q: any) => {
          const start = new Date(q.startDate);
          const end = new Date(q.endDate);
          const isCurrent = now >= start && now <= end;
          
          if (classInfo.id === 'adult') {
            return isCurrent && !q.id.includes('-yad-') && !q.id.includes('-earliteen-') && !q.id.includes('-vanguard-') && !q.id.includes('-cq-');
          }
          return isCurrent && q.id.includes(`-${classInfo.id}-`);
        }) ?? current;

        const lUrl = `https://${preferredQuarterly.index.includes('inverse') || preferredQuarterly.id.includes('-cq') ? 'inverse' : 'absg'}.sspmadventist.org/api/v3/${preferredQuarterly.index}/index.json`;
        const qRes = await fetch(lUrl);
        const qData = await qRes.json();
        
        const todayLesson = qData.lessons?.find((l: any) => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          return now >= start && now <= end;
        });

        if (todayLesson) {
          const lId = todayLesson.id.split('-').pop();
          const detailUrl = `https://${qData.index.includes('inverse') || qData.id.includes('-cq') ? 'inverse' : 'absg'}.sspmadventist.org/api/v3/${qData.index}/${lId}/index.json`;
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
