import promisesData from '../assets/data/promises.json';

export interface PromiseVerse {
  text: string;
  reference: string;
  struct?: {
    book: string;
    chapter: string;
    verses: string;
  };
}

export interface PromiseCategory {
  title: string;
  verses: PromiseVerse[];
}

export const getPromises = (): PromiseCategory[] => {
  return promisesData as PromiseCategory[];
};

export const getRandomPromise = (): PromiseVerse & { category: string } => {
  const categories = getPromises();
  const validCategories = categories.filter(c => c.verses.length > 0);
  const category = validCategories[Math.floor(Math.random() * validCategories.length)];
  const verse = category.verses[Math.floor(Math.random() * category.verses.length)];

  return {
    ...verse,
    category: category.title
  };
};
