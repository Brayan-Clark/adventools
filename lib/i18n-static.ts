import { en } from './i18n/en';
import { fr } from './i18n/fr';
import { mg } from './i18n/mg';
import { Language, TranslationSchema } from './i18n/types';

export const staticTranslations: Record<Language, TranslationSchema> = {
  Français: fr,
  English: en,
  Malagasy: mg,
};
