import React, { useState, useEffect } from 'react';
import { VocabWord, SupportedLanguageCode } from '../types';
import { playAudio, playCorrectSound, playIncorrectSound, playCompleteSound } from '../services/audio';
import { updateWordSRS, saveWeakSpot } from '../services/storage';
import {
  Volume2,
  RotateCw,
  Sparkles,
  Bookmark,
  CheckCircle2,
  Layers,
  ArrowRight,
  Shuffle,
  Headphones,
  Check,
  X,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyVocabPracticeProps {
  words: VocabWord[];
  onUpdateWords: (updated: VocabWord[]) => void;
  selectedLanguage: SupportedLanguageCode;
  onAddXp: (amount: number, wordCount: number) => void;
  onOpenAITutor: (word: VocabWord) => void;
  onNavigateToGrammar: () => void;
}

type PracticeMode = 'flashcards' | 'match' | 'cloze' | 'listening';

export const DailyVocabPractice: React.FC<DailyVocabPracticeProps> = ({
  words,
  onUpdateWords,
  selectedLanguage,
  onAddXp,
  onOpenAITutor,
  onNavigateToGrammar,
}) => {
  const [mode, setMode] = useState<PracticeMode>('flashcards');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);

  // Match drill state
  const [matchSelectedLeft, setMatchSelectedLeft] = useState<string | null>(null);
  const [matchSelectedRight, setMatchSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [matchLeftList, setMatchLeftList] = useState<VocabWord[]>([]);
  const [matchRightList, setMatchRightList] = useState<{ id: string; translation: string }[]>([]);

  // Cloze / Sentence drill state
  const [clozeOptions, setClozeOptions] = useState<string[]>([]);
  const [clozeSelected, setClozeSelected] = useState<string | null>(null);
  const [clozeAnswered, setClozeAnswered] = useState(false);

  // Listening drill state
  const [listeningOptions, setListeningOptions] = useState<string[]>([]);
  const [listeningSelected, setListeningSelected] = useState<string | null>(null);
  const [listeningAnswered, setListeningAnswered] = useState(false);

  // Active queue of words to practice
  const [practiceQueue, setPracticeQueue] = useState<VocabWord[]>([]);

  useEffect(() => {
    // Pick today's practice queue (prioritizing due/learning, or first 6 words)
    const today = new Date().toISOString().split('T')[0];
    const dueWords = words.filter(
      (w) => !w.nextReviewDate || w.nextReviewDate <= today || w.masteryLevel === 'new'
    );
    const queue = dueWords.length > 0 ? dueWords : words.slice(0, 6);
    setPracticeQueue(queue);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
    setSessionReviewedCount(0);
  }, [words, selectedLanguage]);

  const currentWord: VocabWord | undefined = practiceQueue[currentIndex];

  // Set up Match mode
  useEffect(() => {
    if (mode === 'match' && practiceQueue.length > 0) {
      const sample = practiceQueue.slice(0, 5);
      setMatchLeftList([...sample].sort(() => Math.random() - 0.5));
      setMatchRightList(
        sample.map((w) => ({ id: w.id, translation: w.translation })).sort(() => Math.random() - 0.5)
      );
      setMatchedPairs([]);
      setMatchSelectedLeft(null);
      setMatchSelectedRight(null);
    }
  }, [mode, practiceQueue]);

  // Set up Cloze options
  useEffect(() => {
    if ((mode === 'cloze' || mode === 'listening') && currentWord) {
      const incorrectPool = words
        .filter((w) => w.id !== currentWord.id)
        .map((w) => (mode === 'cloze' ? w.word : w.translation))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const target = mode === 'cloze' ? currentWord.word : currentWord.translation;
      const combined = [...incorrectPool, target].sort(() => Math.random() - 0.5);

      if (mode === 'cloze') {
        setClozeOptions(combined);
        setClozeSelected(null);
        setClozeAnswered(false);
      } else {
        setListeningOptions(combined);
        setListeningSelected(null);
        setListeningAnswered(false);
        // Automatically play pronunciation in listening mode
        playAudio(currentWord.word, selectedLanguage);
      }
    }
  }, [mode, currentIndex, currentWord]);

  // Play audio when flipping to front or pressing audio
  const handlePlayAudio = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentWord) {
      playAudio(currentWord.word, selectedLanguage);
    }
  };

  // Toggle bookmark on current card
  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentWord) return;
    const updated = words.map((w) =>
      w.id === currentWord.id ? { ...w, isBookmarked: !w.isBookmarked } : w
    );
    onUpdateWords(updated);
  };

  // Process SRS rating
  const handleGrade = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentWord) return;

    const updatedWord = updateWordSRS(currentWord, rating);
    const updatedAll = words.map((w) => (w.id === updatedWord.id ? updatedWord : w));
    onUpdateWords(updatedAll);

    // If rated 'again', trigger incorrect sound & add to WeakSpotLab
    if (rating === 'again') {
      playIncorrectSound();
      saveWeakSpot({
        id: `vocab-${currentWord.id}`,
        type: 'vocab',
        language: selectedLanguage,
        title: currentWord.word,
        subtitle: currentWord.translation,
        correctAnswer: currentWord.translation,
        explanation: `${currentWord.exampleSentence} (${currentWord.exampleTranslation})`,
        dateAdded: new Date().toISOString(),
        timesFailed: 1,
      });
    } else {
      playCorrectSound();
    }

    // Award XP
    const xpPoints = rating === 'easy' ? 20 : rating === 'good' ? 15 : rating === 'hard' ? 10 : 5;
    onAddXp(xpPoints, 1);
    setSessionReviewedCount((prev) => prev + 1);

    // Advance to next card or complete
    if (currentIndex + 1 < practiceQueue.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setSessionCompleted(true);
      playCompleteSound();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  // Handle Match Selection
  const handleSelectLeft = (id: string) => {
    if (matchedPairs.includes(id)) return;
    setMatchSelectedLeft(id);
    if (matchSelectedRight) {
      checkMatch(id, matchSelectedRight);
    }
  };

  const handleSelectRight = (id: string) => {
    if (matchedPairs.includes(id)) return;
    setMatchSelectedRight(id);
    if (matchSelectedLeft) {
      checkMatch(matchSelectedLeft, id);
    }
  };

  const checkMatch = (leftId: string, rightId: string) => {
    if (leftId === rightId) {
      playCorrectSound();
      const nextMatched = [...matchedPairs, leftId];
      setMatchedPairs(nextMatched);
      setMatchSelectedLeft(null);
      setMatchSelectedRight(null);
      onAddXp(10, 1);

      if (nextMatched.length === matchLeftList.length) {
        setTimeout(() => {
          setSessionCompleted(true);
          playCompleteSound();
          confetti({ particleCount: 70, spread: 65 });
        }, 500);
      }
    } else {
      playIncorrectSound();
      setTimeout(() => {
        setMatchSelectedLeft(null);
        setMatchSelectedRight(null);
      }, 600);
    }
  };

  // Handle Cloze choice
  const handleClozeAnswer = (choice: string) => {
    if (clozeAnswered || !currentWord) return;
    setClozeSelected(choice);
    setClozeAnswered(true);

    if (choice === currentWord.word) {
      playCorrectSound();
      onAddXp(15, 1);
    } else {
      playIncorrectSound();
      saveWeakSpot({
        id: `vocab-cloze-${currentWord.id}`,
        type: 'vocab',
        language: selectedLanguage,
        title: currentWord.word,
        subtitle: currentWord.translation,
        correctAnswer: currentWord.word,
        explanation: `Context sentence: ${currentWord.exampleSentence}`,
        dateAdded: new Date().toISOString(),
        timesFailed: 1,
      });
    }
  };

  // Handle Listening choice
  const handleListeningAnswer = (choice: string) => {
    if (listeningAnswered || !currentWord) return;
    setListeningSelected(choice);
    setListeningAnswered(true);

    if (choice === currentWord.translation) {
      playCorrectSound();
      onAddXp(15, 1);
    } else {
      playIncorrectSound();
      saveWeakSpot({
        id: `vocab-listening-${currentWord.id}`,
        type: 'vocab',
        language: selectedLanguage,
        title: currentWord.word,
        subtitle: currentWord.translation,
        correctAnswer: currentWord.translation,
        explanation: `Auditory word: ${currentWord.word}`,
        dateAdded: new Date().toISOString(),
        timesFailed: 1,
      });
    }
  };

  const handleNextClozeOrListening = () => {
    if (currentIndex + 1 < practiceQueue.length) {
      setCurrentIndex((prev) => prev + 1);
      setClozeAnswered(false);
      setClozeSelected(null);
      setListeningAnswered(false);
      setListeningSelected(null);
    } else {
      setSessionCompleted(true);
      confetti({ particleCount: 75, spread: 70 });
    }
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
    setSessionReviewedCount(0);
    setMatchedPairs([]);
  };

  return (
    <div className="space-y-6">
      {/* Practice Header & Subnav Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Daily Vocabulary Practice
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Spaced Repetition (SM-2)</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums font-medium text-slate-700">
              {practiceQueue.length} cards in today's deck
            </span>
            <span aria-hidden="true">·</span>
            <span>Natural Audio Guides</span>
          </div>
        </div>

        {/* Practice Mode Segmented Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            onClick={() => {
              setMode('flashcards');
              resetSession();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              mode === 'flashcards'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Flashcards</span>
          </button>
          <button
            onClick={() => {
              setMode('match');
              resetSession();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              mode === 'match'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Word Match</span>
          </button>
          <button
            onClick={() => {
              setMode('cloze');
              resetSession();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              mode === 'cloze'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Context Fill</span>
          </button>
          <button
            onClick={() => {
              setMode('listening');
              resetSession();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              mode === 'listening'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Listening</span>
          </button>
        </div>
      </div>

      {/* Completion View */}
      {sessionCompleted ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900">Daily Vocabulary Complete!</h3>
            <p className="text-sm text-slate-600">
              Outstanding work. You reinforced words with spaced repetition intervals, strengthening long-term memory pathways.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100 text-center">
            <div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {sessionReviewedCount || practiceQueue.length}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Cards Reviewed</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                +{(sessionReviewedCount || practiceQueue.length) * 15}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">XP Earned</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={resetSession}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>Review Again</span>
            </button>
            <button
              onClick={onNavigateToGrammar}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Continue to Grammar Quizzes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : practiceQueue.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto">
          <p className="text-slate-600 font-medium">No cards found in current deck.</p>
        </div>
      ) : (
        /* Active Practice Interface */
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Progress Strip */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="tabular-nums font-semibold text-slate-700">
              Card {currentIndex + 1} of {practiceQueue.length}
            </span>
            <div className="w-48 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / practiceQueue.length) * 100}%`,
                }}
              />
            </div>
            <span className="capitalize">{currentWord?.category}</span>
          </div>

          {/* MODE 1: FLASHCARDS */}
          {mode === 'flashcards' && currentWord && (
            <div className="space-y-4">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    setIsFlipped(!isFlipped);
                  }
                }}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-8 sm:p-12 shadow-sm cursor-pointer min-h-[380px] flex flex-col justify-between transition-all relative select-none"
              >
                {/* Top toolbar on card */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="uppercase font-medium tracking-wide">
                      {currentWord.partOfSpeech}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">Interval: {currentWord.intervalDays}d</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePlayAudio}
                      className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Listen to native pronunciation"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleToggleBookmark}
                      className={`p-2 rounded-lg transition-colors ${
                        currentWord.isBookmarked
                          ? 'text-amber-500 hover:bg-amber-50'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Bookmark card"
                    >
                      <Bookmark className={`w-5 h-5 ${currentWord.isBookmarked ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Center Content */}
                <div className="py-8 text-center space-y-4">
                  {!isFlipped ? (
                    // Front of card
                    <div className="space-y-3">
                      <h3 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                        {currentWord.word}
                      </h3>
                      {currentWord.transliteration && (
                        <p className="text-base text-slate-500 font-mono">
                          {currentWord.transliteration}
                        </p>
                      )}
                      {currentWord.ipa && (
                        <p className="text-xs text-slate-400 font-mono tracking-wider">
                          {currentWord.ipa}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 pt-4">Click card or press Space to reveal translation</p>
                    </div>
                  ) : (
                    // Back of card (revealed)
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <h4 className="text-3xl font-bold text-emerald-800">
                          {currentWord.translation}
                        </h4>
                        <p className="text-sm font-semibold text-slate-800">
                          {currentWord.word}
                        </p>
                      </div>

                      {/* Example sentence */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left max-w-xl mx-auto space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900 leading-relaxed">
                            {currentWord.exampleSentence}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playAudio(currentWord.exampleSentence, selectedLanguage);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="Play sentence audio"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">
                          {currentWord.exampleTranslation}
                        </p>
                      </div>

                      {/* Memory hook or grammar note */}
                      {(currentWord.mnemonic || currentWord.grammarNote) && (
                        <div className="text-xs text-slate-600 max-w-lg mx-auto bg-amber-50/70 border border-amber-200/60 p-3 rounded-lg text-left">
                          {currentWord.mnemonic && (
                            <p>
                              <strong className="text-amber-900">Mnemonic:</strong>{' '}
                              {currentWord.mnemonic}
                            </p>
                          )}
                          {currentWord.grammarNote && (
                            <p className="mt-1">
                              <strong className="text-amber-900">Note:</strong>{' '}
                              {currentWord.grammarNote}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Card Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAITutor(currentWord);
                    }}
                    className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ask AI Tutor Breakdown</span>
                  </button>

                  <span className="flex items-center gap-1 text-slate-500">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{isFlipped ? 'Flip back' : 'Flip card'}</span>
                  </span>
                </div>
              </div>

              {/* Spaced Repetition Grading Buttons */}
              {isFlipped && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 animate-in fade-in duration-200">
                  <button
                    onClick={() => handleGrade('again')}
                    className="p-3 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-900 text-center transition-colors shadow-sm"
                  >
                    <div className="text-xs font-bold uppercase tracking-wider">Again</div>
                    <div className="text-xs text-rose-700 mt-0.5">&lt; 1 day</div>
                  </button>
                  <button
                    onClick={() => handleGrade('hard')}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-center transition-colors shadow-sm"
                  >
                    <div className="text-xs font-bold uppercase tracking-wider">Hard</div>
                    <div className="text-xs text-amber-700 mt-0.5">1-2 days</div>
                  </button>
                  <button
                    onClick={() => handleGrade('good')}
                    className="p-3 rounded-xl border border-sky-200 bg-sky-50/80 hover:bg-sky-100 text-sky-900 text-center transition-colors shadow-sm"
                  >
                    <div className="text-xs font-bold uppercase tracking-wider">Good</div>
                    <div className="text-xs text-sky-700 mt-0.5">3-4 days</div>
                  </button>
                  <button
                    onClick={() => handleGrade('easy')}
                    className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 text-center transition-colors shadow-sm"
                  >
                    <div className="text-xs font-bold uppercase tracking-wider">Easy</div>
                    <div className="text-xs text-emerald-700 mt-0.5">7+ days</div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: WORD MATCH */}
          {mode === 'match' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Word Match Speed Drill</h3>
                <p className="text-xs text-slate-500">
                  Tap a word in the left column, then match its English definition on the right.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left column: Target words */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
                    Target Language
                  </div>
                  {matchLeftList.map((item) => {
                    const isMatched = matchedPairs.includes(item.id);
                    const isSelected = matchSelectedLeft === item.id;
                    return (
                      <button
                        key={`left-${item.id}`}
                        disabled={isMatched}
                        onClick={() => handleSelectLeft(item.id)}
                        className={`w-full p-3.5 rounded-xl border text-left font-medium text-sm transition-all flex items-center justify-between ${
                          isMatched
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-60'
                            : isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span>{item.word}</span>
                        {isMatched && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>

                {/* Right column: English translations */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
                    English Meaning
                  </div>
                  {matchRightList.map((item) => {
                    const isMatched = matchedPairs.includes(item.id);
                    const isSelected = matchSelectedRight === item.id;
                    return (
                      <button
                        key={`right-${item.id}`}
                        disabled={isMatched}
                        onClick={() => handleSelectRight(item.id)}
                        className={`w-full p-3.5 rounded-xl border text-left text-sm transition-all flex items-center justify-between ${
                          isMatched
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-60'
                            : isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span>{item.translation}</span>
                        {isMatched && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: CONTEXT FILL (CLOZE) */}
          {mode === 'cloze' && currentWord && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-6 shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sentence Context Challenge
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Select the missing word to complete the sentence:
                </h3>
              </div>

              {/* Target sentence with blank */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-2">
                <p className="text-xl font-medium text-slate-900 leading-relaxed">
                  {currentWord.exampleSentence.replace(
                    new RegExp(currentWord.word, 'gi'),
                    '________'
                  )}
                </p>
                <p className="text-sm text-slate-500">{currentWord.exampleTranslation}</p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {clozeOptions.map((opt, i) => {
                  const isCorrect = opt === currentWord.word;
                  const isPicked = clozeSelected === opt;
                  let btnStyle = 'bg-white border-slate-200 hover:border-slate-300 text-slate-900';

                  if (clozeAnswered) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                    } else if (isPicked) {
                      btnStyle = 'bg-rose-50 border-rose-500 text-rose-900';
                    } else {
                      btnStyle = 'opacity-40 border-slate-200 bg-white text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={i}
                      disabled={clozeAnswered}
                      onClick={() => handleClozeAnswer(opt)}
                      className={`p-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {clozeAnswered && isCorrect && <Check className="w-4 h-4 text-emerald-600" />}
                      {clozeAnswered && isPicked && !isCorrect && (
                        <X className="w-4 h-4 text-rose-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {clozeAnswered && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNextClozeOrListening}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <span>Next Sentence</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE 4: LISTENING PRACTICE */}
          {mode === 'listening' && currentWord && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-6 shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Audio Ear Training
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Listen carefully and select the correct translation:
                </h3>
              </div>

              {/* Big Audio Play Button */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-3">
                <button
                  onClick={() => playAudio(currentWord.word, selectedLanguage)}
                  className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
                  title="Replay pronunciation"
                >
                  <Volume2 className="w-8 h-8" />
                </button>
                <p className="text-xs text-slate-500">Tap to repeat pronunciation</p>
                {listeningAnswered && (
                  <div className="pt-2">
                    <span className="text-lg font-bold text-slate-900">{currentWord.word}</span>
                    {currentWord.ipa && (
                      <span className="text-xs text-slate-400 ml-2 font-mono">
                        {currentWord.ipa}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Listening Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {listeningOptions.map((opt, i) => {
                  const isCorrect = opt === currentWord.translation;
                  const isPicked = listeningSelected === opt;
                  let btnStyle = 'bg-white border-slate-200 hover:border-slate-300 text-slate-900';

                  if (listeningAnswered) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                    } else if (isPicked) {
                      btnStyle = 'bg-rose-50 border-rose-500 text-rose-900';
                    } else {
                      btnStyle = 'opacity-40 border-slate-200 bg-white text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={i}
                      disabled={listeningAnswered}
                      onClick={() => handleListeningAnswer(opt)}
                      className={`p-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {listeningAnswered && isCorrect && <Check className="w-4 h-4 text-emerald-600" />}
                      {listeningAnswered && isPicked && !isCorrect && (
                        <X className="w-4 h-4 text-rose-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {listeningAnswered && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNextClozeOrListening}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <span>Next Audio Card</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
