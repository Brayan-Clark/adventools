import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { MofonainaWidget } from './MofonainaWidget';
import { LesonaWidget } from './LesonaWidget';
import { ShortcutsWidget } from './ShortcutsWidget';
import { getMofonainaForDate } from '../lib/mofonaina';

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

  let title = "Ouvrez l'application";
  let verse = "Synchronisez vos textes pour afficher la Veille Matinale d'aujourd'hui.";
  let reference = "Adventools";

  try {
    const data = await getMofonainaForDate(new Date());
    if (data && data.lohateny_andro) {
      title = data.lohateny_andro;
      verse = data.andininy_soratra_masina;
      reference = data.toerana_soratra_masina;
    }
  } catch (error) {
    console.error(error);
  }

  props.renderWidget(<MofonainaWidget title={title} verse={verse} reference={reference} />);
}

async function renderLesona(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  let title = "Leçon du jour";
  let verse = "Ouvrez l'application pour télécharger la leçon de cette semaine.";
  let reference = "École du Sabbat";

  // TODO: We could fetch the actual Sabbath School data here later
  // For now, we render the placeholder which directs the user.

  props.renderWidget(<LesonaWidget title={title} verse={verse} reference={reference} />);
}
