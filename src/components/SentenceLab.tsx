import React, { useState, useEffect } from 'react';
import { SentenceExercise, SupportedLanguageCode } from '../types';
import { SENTENCE_EXERCISES } from '../data/curriculum';
import { playAudio, playCorrectSound, playIncorrectSound } from '../services/audio';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SentenceLabProps {
  selectedLanguage: SupportedLanguageCode;
  onAddXp: (amount: number, wordCount: number) => void;
  onOpenAITutorSentence: (sentence: string, english: string, explanation: string) => void;
}

export const SentenceLab: React.FC<SentenceLabProps> = ({
  selectedLanguage,
  onAddXp,
  onOpenAITutorSentence,
}) => {
  const exercises = SENTENCE_EXERCISES[selectedLanguage] || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setSelectedWords([]);
    setIsAnswered(false);
    setIsCorrect(false);
  }, [selectedLanguage]);

  const currentExercise: SentenceExercise | undefined = exercises[currentIndex];

  // Available remaining words to tap
  const availableWords = React.useMemo(() => {
    if (!currentExercise) return [];
    const pool = [...currentExercise.scrambledWords];
    for (const w of selectedWords) {
      const idx = pool.indexOf(w);
      if (idx !== -1) {
        pool.splice(idx, 1);
      }
    }
    return pool;
  }, [currentExercise, selectedWords]);

  const handleAddWord = (word: string) => {
    if (isAnswered) return;
    setSelectedWords((prev) => [...prev, word]);
  };

  const handleRemoveWord = (index: number) => {
    if (isAnswered) return;
    setSelectedWords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetCurrent = () => {
    setSelectedWords([]);
    setIsAnswered(false);
    setIsCorrect(false);
  };

  const handleCheck = () => {
    if (!currentExercise || isAnswered || selectedWords.length === 0) return;

    const userFormed = selectedWords.join(' ').trim().toLowerCase();
    const targetExpected = currentExercise.correctWords.join(' ').trim().toLowerCase();
    const correct = userFormed === targetExpected;

    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct) {
      playCorrectSound();
      onAddXp(25, 1);
      confetti({ particleCount: 50, spread: 60 });
      playAudio(currentExercise.targetSentence, selectedLanguage);
    } else {
      playIncorrectSound();
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < exercises.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedWords([]);
      setIsAnswered(false);
      setIsCorrect(false);
    } else {
      // Loop or restart
      setCurrentIndex(0);
      setSelectedWords([]);
      setIsAnswered(false);
      setIsCorrect(false);
    }
  };

  if (!currentExercise) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto">
        <p className="text-slate-600 font-medium">No sentence exercises available for this language yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sentence Lab</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Syntax Constructor</span>
            <span aria-hidden="true">·</span>
            <span>Word Order Practice</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Exercise {currentIndex + 1} of {exercises.length}</span>
          </div>
        </div>

        <div className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 self-start sm:self-auto">
          {currentExercise.difficulty}
        </div>
      </div>

      {/* Exercise Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-6 shadow-sm">
        {/* English Prompt */}
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Translate this thought into target grammar:
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
            "{currentExercise.englishPrompt}"
          </h3>
        </div>

        {/* User Workspace (Constructed sentence) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Your sentence order:</span>
            {selectedWords.length > 0 && !isAnswered && (
              <button
                onClick={handleResetCurrent}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear words</span>
              </button>
            )}
          </div>

          <div
            className={`min-h-[84px] p-4 rounded-xl border-2 transition-all flex flex-wrap gap-2 items-center ${
              isAnswered
                ? isCorrect
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : 'border-rose-300 bg-rose-50/40'
                : 'border-dashed border-slate-200 bg-slate-50/60'
            }`}
          >
            {selectedWords.length === 0 ? (
              <span className="text-xs text-slate-400 italic">
                Tap words below in grammatical order to construct the sentence...
              </span>
            ) : (
              selectedWords.map((word, wIdx) => (
                <button
                  key={`sel-${wIdx}`}
                  disabled={isAnswered}
                  onClick={() => handleRemoveWord(wIdx)}
                  className="px-3.5 py-2 bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-600 rounded-lg text-sm font-semibold text-slate-900 shadow-2xs transition-colors"
                  title="Tap to remove"
                >
                  {word}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Word Tiles Selection Pool */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Word Bank
          </div>
          <div className="flex flex-wrap gap-2.5">
            {availableWords.map((word, pIdx) => (
              <button
                key={`avail-${pIdx}`}
                disabled={isAnswered}
                onClick={() => handleAddWord(word)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-sm font-semibold rounded-lg transition-colors shadow-2xs"
              >
                {word}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Banner */}
        {isAnswered && (
          <div
            className={`p-5 rounded-xl border space-y-3 animate-in fade-in duration-200 ${
              isCorrect
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/80 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Correct grammatical order!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>Incorrect word order.</span>
                  </>
                )}
              </div>

              <button
                onClick={() => playAudio(currentExercise.targetSentence, selectedLanguage)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-lg transition-colors"
                title="Hear sentence"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {!isCorrect && (
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-rose-900">Correct Order:</span>
                <p className="font-bold text-slate-900 text-sm">{currentExercise.targetSentence}</p>
              </div>
            )}

            <p className="text-xs text-slate-700 leading-relaxed border-t border-slate-200/50 pt-2">
              <strong className="text-slate-900">Linguistic Rule:</strong>{' '}
              {currentExercise.grammarExplanation}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={() =>
              onOpenAITutorSentence(
                currentExercise.targetSentence,
                currentExercise.englishPrompt,
                currentExercise.grammarExplanation
              )
            }
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Ask AI to Break Down Grammar</span>
          </button>

          {!isAnswered ? (
            <button
              onClick={handleCheck}
              disabled={selectedWords.length === 0}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              Check Sentence
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              <span>{currentIndex + 1 < exercises.length ? 'Next Sentence' : 'Restart Lab'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
