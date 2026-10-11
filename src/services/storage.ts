import { VocabWord, UserStats, WeakSpotItem, SupportedLanguageCode } from '../types';
import { INITIAL_VOCABULARY } from '../data/curriculum';

const STORAGE_KEYS = {
  VOCAB_PREFIX: 'linguapulse_vocab_',
  STATS: 'linguapulse_stats',
  WEAK_SPOTS: 'linguapulse_weakspots',
  SELECTED_LANG: 'linguapulse_selected_lang',
  CUSTOM_TOPICS: 'linguapulse_custom_topics',
};

const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getStoredLanguage = (): SupportedLanguageCode => {
  try {
    const lang = localStorage.getItem(STORAGE_KEYS.SELECTED_LANG);
    if (lang && ['es', 'fr', 'de', 'ja', 'it'].includes(lang)) {
      return lang as SupportedLanguageCode;
    }
  } catch {
    // fallback
  }
  return 'es';
};

export const saveStoredLanguage = (lang: SupportedLanguageCode): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTED_LANG, lang);
  } catch (err) {
    console.error('Storage error:', err);
  }
};

export const getVocabularyForLanguage = (lang: SupportedLanguageCode): VocabWord[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.VOCAB_PREFIX}${lang}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load vocabulary from storage:', err);
  }

  // Fallback to initial vocabulary for this language
  const initial = INITIAL_VOCABULARY[lang] || [];
  saveVocabularyForLanguage(lang, initial);
  return initial;
};

export const saveVocabularyForLanguage = (lang: SupportedLanguageCode, words: VocabWord[]): void => {
  try {
    localStorage.setItem(`${STORAGE_KEYS.VOCAB_PREFIX}${lang}`, JSON.stringify(words));
  } catch (err) {
    console.error('Failed to save vocabulary to storage:', err);
  }
};

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 * Rating:
 * 'again' -> score 1
 * 'hard'  -> score 3
 * 'good'  -> score 4
 * 'easy'  -> score 5
 */
export const updateWordSRS = (
  word: VocabWord,
  rating: 'again' | 'hard' | 'good' | 'easy'
): VocabWord => {
  let q = 4;
  if (rating === 'again') q = 1;
  else if (rating === 'hard') q = 3;
  else if (rating === 'good') q = 4;
  else if (rating === 'easy') q = 5;

  let repetitions = word.repetitions || 0;
  let intervalDays = word.intervalDays || 1;
  let easeFactor = word.easeFactor || 2.5;

  if (q < 3) {
    // Failed recall: reset repetitions, interval restarts at 1 day
    repetitions = 0;
    intervalDays = 1;
  } else {
    // Successful recall
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = rating === 'easy' ? 4 : 2;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Determine mastery level
  let masteryLevel = word.masteryLevel;
  if (repetitions >= 4 || intervalDays >= 7) {
    masteryLevel = 'mastered';
  } else if (repetitions >= 1) {
    masteryLevel = 'learning';
  } else {
    masteryLevel = 'new';
  }

  const today = new Date();
  const nextDate = new Date();
  nextDate.setDate(today.getDate() + intervalDays);
  const nextReviewDate = nextDate.toISOString().split('T')[0];

  return {
    ...word,
    repetitions,
    intervalDays,
    easeFactor: Number(easeFactor.toFixed(2)),
    nextReviewDate,
    lastReviewedDate: getTodayString(),
    masteryLevel,
    timesCorrect: q >= 3 ? (word.timesCorrect || 0) + 1 : word.timesCorrect || 0,
    timesIncorrect: q < 3 ? (word.timesIncorrect || 0) + 1 : word.timesIncorrect || 0,
  };
};

export const getUserStats = (): UserStats => {
  const today = getTodayString();
  const defaultStats: UserStats = {
    streakDays: 1,
    lastActiveDate: today,
    historyDates: [today],
    totalXp: 120,
    dailyGoalWords: 5,
    dailyGoalQuizzes: 2,
    wordsReviewedToday: 0,
    quizzesCompletedToday: 0,
    todayDate: today,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (raw) {
      const stats = JSON.parse(raw);
      // Check if new day
      if (stats.todayDate !== today) {
        // Calculate streak
        const lastDate = new Date(stats.lastActiveDate || today);
        const currDate = new Date(today);
        const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        let newStreak = stats.streakDays || 1;
        if (diffDays === 1) {
          // Continuous active day
          newStreak += 1;
        } else if (diffDays > 1) {
          // Streak broken
          newStreak = 1;
        }

        const historyDates = Array.isArray(stats.historyDates) ? stats.historyDates : [];
        if (!historyDates.includes(today)) {
          historyDates.push(today);
        }

        const refreshedStats: UserStats = {
          ...stats,
          streakDays: newStreak,
          lastActiveDate: today,
          todayDate: today,
          wordsReviewedToday: 0,
          quizzesCompletedToday: 0,
          historyDates,
        };
        saveUserStats(refreshedStats);
        return refreshedStats;
      }
      return stats;
    }
  } catch (err) {
    console.error('Failed to load user stats:', err);
  }

  saveUserStats(defaultStats);
  return defaultStats;
};

export const saveUserStats = (stats: UserStats): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (err) {
    console.error('Failed to save user stats:', err);
  }
};

export const addXp = (amount: number, wordReviewCount = 0, quizCount = 0): UserStats => {
  const stats = getUserStats();
  const updated: UserStats = {
    ...stats,
    totalXp: (stats.totalXp || 0) + amount,
    wordsReviewedToday: (stats.wordsReviewedToday || 0) + wordReviewCount,
    quizzesCompletedToday: (stats.quizzesCompletedToday || 0) + quizCount,
    lastActiveDate: getTodayString(),
  };

  if (!updated.historyDates.includes(getTodayString())) {
    updated.historyDates.push(getTodayString());
  }

  saveUserStats(updated);
  return updated;
};

export const getWeakSpots = (): WeakSpotItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WEAK_SPOTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load weak spots:', err);
  }
  return [];
};

export const saveWeakSpot = (item: WeakSpotItem): void => {
  try {
    const spots = getWeakSpots();
    const existingIndex = spots.findIndex((s) => s.id === item.id);
    if (existingIndex >= 0) {
      spots[existingIndex].timesFailed += 1;
    } else {
      spots.unshift(item);
    }
    localStorage.setItem(STORAGE_KEYS.WEAK_SPOTS, JSON.stringify(spots));
  } catch (err) {
    console.error('Failed to save weak spot:', err);
  }
};

export const removeWeakSpot = (id: string): void => {
  try {
    const spots = getWeakSpots().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.WEAK_SPOTS, JSON.stringify(spots));
  } catch (err) {
    console.error('Failed to remove weak spot:', err);
  }
};
