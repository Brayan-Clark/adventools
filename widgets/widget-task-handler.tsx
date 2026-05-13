import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { MofonainaWidget } from './MofonainaWidget';
import { LesonaWidget } from './LesonaWidget';
import { ShortcutsWidget } from './ShortcutsWidget';
import { getMofonainaForDate } from '../lib/mofonaina';

// Maps the profile_eds_class value (stored in AsyncStorage) to its
// corresponding Adventech API identifier (e.g. "adult", "yad", "earliteen")
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
  // Sabbath School week runs Sat → Fri. Lesson starts on Saturday.
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
  let memoryVerse = '';
  let category = 'École du Sabbat';
  let weekRange = '';

  try {
    // 1. Read user's preferred language
    const savedLang = await AsyncStorage.getItem('adventools_ss_selected_lang') ?? 'fr';

    // 2. Read user's chosen EDS class
    const edsClass = await AsyncStorage.getItem('profile_eds_class') ?? 'Adulte';
    const classInfo = CLASS_TO_API_ID[edsClass] ?? CLASS_TO_API_ID['Adulte'];
    category = classInfo.label;

    // 3. Get the current quarterly ID from cache (set by the app)
    const cacheKey = `adventools_ss_${savedLang}_${classInfo.id}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      const quarterlies: any[] = Array.isArray(data) ? data : [];

      // Find the current quarterly (most recent by date)
      const now = new Date();
      const current = quarterlies.find((q: any) => {
        const start = q.start_date ? new Date(q.start_date) : null;
        const end = q.end_date ? new Date(q.end_date) : null;
        return start && end && now >= start && now <= end;
      }) ?? quarterlies[0];

      if (current) {
        // 4. Get the lesson number for this week
        lessonNumber = getTodayLessonNumber();
        
        // 5. Try to fetch the current lesson details from the API
        const apiLang = savedLang === 'fr' ? 'fr' : (savedLang === 'mg' ? 'mg' : 'en');
        const lessonUrl = `https://sabbath-school.adventech.io/api/v2/${apiLang}/quarterlies/${current.id}/lessons/${lessonNumber}/index.json`;
        
        const response = await fetch(lessonUrl);
        if (response.ok) {
          const lessonData = await response.json();
          title = lessonData.title ?? title;
          
          // Extract start and end date for the week label
          if (lessonData.start_date && lessonData.end_date) {
            const start = new Date(lessonData.start_date);
            const end = new Date(lessonData.end_date);
            const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
            weekRange = `${fmt(start)} – ${fmt(end)}`;
          }

          // Extract memory verse from days (usually day 1 has it)
          const days = lessonData.days ?? [];
          if (days.length > 0 && days[0].read) {
            memoryVerse = (days[0].read as string).substring(0, 120);
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
      memoryVerse={memoryVerse}
      category={category}
      weekRange={weekRange}
    />
  );
}
