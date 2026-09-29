export type WordStatus = 'new' | 'learning' | 'known';

export interface Word {
  id: string;
  term: string;
  pos: string;
  ipa: string;
  translation_uk: string;
  definition_en: string;
  example_en: string;
  topics: string[];
  level: string;
  sort_order: number;
  /** null = shared dictionary word; set = the user's own custom word. */
  owner_id: string | null;
}

export interface UserWord {
  word_id: string;
  ease: number;
  interval_days: number;
  due_on: string;
  reps: number;
  lapses: number;
  status: WordStatus;
}

/** 0–5 like SM-2: below 3 = forgotten. */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;
