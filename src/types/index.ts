export type SupportedLanguageCode = 'es' | 'fr' | 'de' | 'ja' | 'it';

export interface Language {
  code: SupportedLanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  speechCode: string;
  tagline: string;
}

export type MasteryLevel = 'new' | 'learning' | 'mastered';

export interface VocabWord {
  id: string;
  language: SupportedLanguageCode;
  word: string;
  transliteration?: string; // Romaji, Pinyin, or phonetic spelling
  translation: string;
  ipa?: string;
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'preposition' | 'conjunction';
  category: string;
  exampleSentence: string;
  exampleTranslation: string;
  mnemonic?: string;
  grammarNote?: string;
  
  // SRS properties
  masteryLevel: MasteryLevel;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: string; // ISO date string (YYYY-MM-DD)
  lastReviewedDate?: string;
  isBookmarked?: boolean;
  timesCorrect: number;
  timesIncorrect: number;
}

export type QuestionType = 'multiple-choice' | 'fill-blank' | 'word-order' | 'error-fix';

export interface GrammarQuestion {
  id: string;
  topicId: string;
  type: QuestionType;
  prompt: string;
  targetSentence?: string;
  options?: string[];
  correctOptionIndex?: number;
  correctWord?: string;
  wordsToOrder?: string[];
  correctOrder?: string[];
  errorPart?: string;
  correctedPart?: string;
  explanation: string;
  ruleReference?: string;
}

export interface GrammarRuleTable {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface GrammarTopic {
  id: string;
  language: SupportedLanguageCode;
  title: string;
  category: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  overview: string;
  keyRule: string;
  tables?: GrammarRuleTable[];
  quickTips: string[];
  questions: GrammarQuestion[];
}

export interface SentenceExercise {
  id: string;
  language: SupportedLanguageCode;
  englishPrompt: string;
  targetSentence: string;
  scrambledWords: string[];
  correctWords: string[];
  grammarExplanation: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface UserStats {
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  historyDates: string[]; // Set of YYYY-MM-DD active days
  totalXp: number;
  dailyGoalWords: number;
  dailyGoalQuizzes: number;
  wordsReviewedToday: number;
  quizzesCompletedToday: number;
  todayDate: string;
}

export interface WeakSpotItem {
  id: string;
  type: 'vocab' | 'grammar';
  language: SupportedLanguageCode;
  title: string;
  subtitle: string;
  correctAnswer: string;
  explanation: string;
  dateAdded: string;
  timesFailed: number;
}

export interface AITutorResponse {
  title: string;
  summary: string;
  breakdown: Array<{
    component: string;
    meaning: string;
  }>;
  keyRule: string;
  commonPitfalls: string[];
  exampleSentences: Array<{
    target: string;
    translation: string;
    note?: string;
  }>;
  mnemonic?: string;
}
