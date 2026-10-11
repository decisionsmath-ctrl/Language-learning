import React, { useState } from 'react';
import { GrammarTopic, GrammarQuestion, SupportedLanguageCode } from '../types';
import { GRAMMAR_TOPICS } from '../data/curriculum';
import { saveWeakSpot } from '../services/storage';
import { playCorrectSound, playIncorrectSound, playCompleteSound } from '../services/audio';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ListOrdered,
  ChevronRight,
  Info,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface InteractiveGrammarQuizProps {
  selectedLanguage: SupportedLanguageCode;
  onAddXp: (amount: number, wordCount: number, quizCount: number) => void;
  onOpenAITutor: (question: GrammarQuestion, topic: GrammarTopic) => void;
  customTopics?: GrammarTopic[];
}

export const InteractiveGrammarQuiz: React.FC<InteractiveGrammarQuizProps> = ({
  selectedLanguage,
  onAddXp,
  onOpenAITutor,
  customTopics = [],
}) => {
  // Combine built-in language topics with custom AI generated topics for this language
  const staticTopics = GRAMMAR_TOPICS[selectedLanguage] || [];
  const currentLangCustom = customTopics.filter((t) => t.language === selectedLanguage);
  const allTopics = [...staticTopics, ...currentLangCustom];

  const [selectedTopic, setSelectedTopic] = useState<GrammarTopic | null>(allTopics[0] || null);
  const [activeTab, setActiveTab] = useState<'quiz' | 'guide'>('quiz');

  // Quiz running state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [fillBlankInput, setFillBlankInput] = useState('');
  const [orderedWords, setOrderedWords] = useState<string[]>([]);
  const [errorFixInput, setErrorFixInput] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [answeredHistory, setAnsweredHistory] = useState<
    Array<{ question: GrammarQuestion; wasCorrect: boolean; userAnswer: string }>
  >([]);

  // Update selected topic if language changes
  React.useEffect(() => {
    const topics = [...(GRAMMAR_TOPICS[selectedLanguage] || []), ...currentLangCustom];
    setSelectedTopic(topics[0] || null);
    resetQuiz();
  }, [selectedLanguage]);

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setFillBlankInput('');
    setOrderedWords([]);
    setErrorFixInput('');
    setIsAnswered(false);
    setIsCorrect(false);
    setScore(0);
    setQuizCompleted(false);
    setAnsweredHistory([]);
  };

  const handleSelectTopic = (topic: GrammarTopic) => {
    setSelectedTopic(topic);
    resetQuiz();
  };

  const currentQuestion: GrammarQuestion | undefined = selectedTopic?.questions[currentQuestionIndex];

  // For word-order question: available pool of words
  const availablePool = React.useMemo(() => {
    if (!currentQuestion || currentQuestion.type !== 'word-order') return [];
    const source = currentQuestion.wordsToOrder || [];
    // Filter out words that have already been placed in orderedWords
    const remaining = [...source];
    for (const w of orderedWords) {
      const idx = remaining.indexOf(w);
      if (idx !== -1) remaining.splice(idx, 1);
    }
    return remaining;
  }, [currentQuestion, orderedWords]);

  // Answer submission handler
  const handleCheckAnswer = () => {
    if (!currentQuestion || isAnswered) return;

    let correct = false;
    let answerText = '';

    if (currentQuestion.type === 'multiple-choice') {
      correct = selectedOption === currentQuestion.correctOptionIndex;
      answerText = selectedOption !== null && currentQuestion.options ? currentQuestion.options[selectedOption] : '';
    } else if (currentQuestion.type === 'fill-blank') {
      const cleanInput = fillBlankInput.trim().toLowerCase();
      const cleanTarget = (currentQuestion.correctWord || '').trim().toLowerCase();
      correct = cleanInput === cleanTarget;
      answerText = fillBlankInput;
    } else if (currentQuestion.type === 'word-order') {
      const formed = orderedWords.join(' ').trim();
      const expected = (currentQuestion.correctOrder || []).join(' ').trim();
      correct = formed.toLowerCase() === expected.toLowerCase();
      answerText = formed;
    } else if (currentQuestion.type === 'error-fix') {
      const cleanInput = errorFixInput.trim().toLowerCase();
      const cleanExpected = (currentQuestion.correctedPart || '').trim().toLowerCase();
      correct = cleanInput === cleanExpected;
      answerText = errorFixInput;
    }

    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct) {
      playCorrectSound();
      setScore((prev) => prev + 1);
      onAddXp(20, 0, 0);
    } else {
      playIncorrectSound();
      // Save to weak spots
      saveWeakSpot({
        id: `grammar-${currentQuestion.id}`,
        type: 'grammar',
        language: selectedLanguage,
        title: selectedTopic?.title || 'Grammar Question',
        subtitle: currentQuestion.prompt,
        correctAnswer:
          currentQuestion.correctWord ||
          currentQuestion.correctedPart ||
          (currentQuestion.options && currentQuestion.correctOptionIndex !== undefined
            ? currentQuestion.options[currentQuestion.correctOptionIndex]
            : (currentQuestion.correctOrder || []).join(' ')),
        explanation: currentQuestion.explanation,
        dateAdded: new Date().toISOString(),
        timesFailed: 1,
      });
    }

    setAnsweredHistory((prev) => [
      ...prev,
      { question: currentQuestion, wasCorrect: correct, userAnswer: answerText },
    ]);
  };

  const handleNextQuestion = () => {
    if (!selectedTopic) return;

    if (currentQuestionIndex + 1 < selectedTopic.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setFillBlankInput('');
      setOrderedWords([]);
      setErrorFixInput('');
      setIsAnswered(false);
      setIsCorrect(false);
    } else {
      setQuizCompleted(true);
      playCompleteSound();
      onAddXp(50, 0, 1);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Topic Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Interactive Grammar Quizzes
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Syntax & Morphology</span>
            <span aria-hidden="true">·</span>
            <span>Instant Explanations</span>
            <span aria-hidden="true">·</span>
            <span>Rules Cheatsheets</span>
          </div>
        </div>

        {/* Topic Selector Dropdown / Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {allTopics.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectTopic(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all border ${
                selectedTopic?.id === t.id
                  ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span className="font-mono text-slate-400 mr-1.5">{t.level}</span>
              <span>{t.title.split('(')[0].trim()}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedTopic && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Topic Title Card with Mode Toggle */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className="font-semibold text-emerald-700">{selectedTopic.category}</span>
                <span aria-hidden="true">·</span>
                <span>Level {selectedTopic.level}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{selectedTopic.questions.length} questions</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{selectedTopic.title}</h3>
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{selectedTopic.overview}</p>
            </div>

            {/* Toggle between Quiz and Grammar Guide */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
              <button
                onClick={() => setActiveTab('quiz')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'quiz'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Interactive Quiz
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === 'guide'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Grammar Guide</span>
              </button>
            </div>
          </div>

          {/* TAB 1: GRAMMAR GUIDE CHEATSHEET */}
          {activeTab === 'guide' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="space-y-2">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>Grammar Rules & Formulations</span>
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedTopic.overview}</p>
              </div>

              {/* Golden Rule Highlight */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                  Core Rule
                </div>
                <p className="text-sm font-medium text-emerald-950 leading-relaxed">
                  {selectedTopic.keyRule}
                </p>
              </div>

              {/* Conjugation / Rule Tables */}
              {selectedTopic.tables && selectedTopic.tables.length > 0 && (
                <div className="space-y-4">
                  {selectedTopic.tables.map((table, tIdx) => (
                    <div key={tIdx} className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            {table.headers.map((h, hIdx) => (
                              <th key={hIdx} className="p-3 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/50">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-3 font-medium text-slate-800">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {table.caption && (
                        <div className="p-2 text-xs text-slate-500 bg-slate-50/50 text-right">
                          {table.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Tips */}
              {selectedTopic.quickTips && selectedTopic.quickTips.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Pro Tips & Memory Hooks
                  </h5>
                  <ul className="space-y-2">
                    {selectedTopic.quickTips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveTab('quiz')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <span>Start Topic Quiz</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE QUIZ RUNNER */}
          {activeTab === 'quiz' && (
            <div>
              {quizCompleted ? (
                /* Completed Summary */
                <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm space-y-6">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-slate-900">Quiz Completed!</h3>
                    <p className="text-sm text-slate-600">
                      Topic: <span className="font-semibold text-slate-800">{selectedTopic.title}</span>
                    </p>
                  </div>

                  {/* Score Matrix */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100 text-center">
                    <div>
                      <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
                        {score} / {selectedTopic.questions.length}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {Math.round((score / selectedTopic.questions.length) * 100)}% Accuracy
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-emerald-600 tabular-nums">
                        +{score * 20 + 50}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">XP Points Earned</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={resetQuiz}
                      className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Retake Quiz</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('guide')}
                      className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Review Grammar Guide</span>
                    </button>
                  </div>
                </div>
              ) : currentQuestion ? (
                /* Question Card */
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-6 shadow-sm">
                  {/* Question Progress Header */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                    <span className="tabular-nums font-semibold text-slate-800">
                      Question {currentQuestionIndex + 1} of {selectedTopic.questions.length}
                    </span>
                    <span className="capitalize">{currentQuestion.type.replace('-', ' ')}</span>
                  </div>

                  {/* Question Prompt */}
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-slate-900 leading-snug">
                      {currentQuestion.prompt}
                    </h4>
                  </div>

                  {/* QUESTION TYPE 1: MULTIPLE CHOICE */}
                  {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                    <div className="space-y-3 pt-2">
                      {currentQuestion.options.map((opt, oIdx) => {
                        const isPicked = selectedOption === oIdx;
                        const isRight = oIdx === currentQuestion.correctOptionIndex;

                        let style = 'bg-white border-slate-200 hover:border-slate-300 text-slate-900';
                        if (isAnswered) {
                          if (isRight) {
                            style = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold';
                          } else if (isPicked) {
                            style = 'bg-rose-50 border-rose-500 text-rose-950';
                          } else {
                            style = 'opacity-40 border-slate-200 text-slate-400 bg-white';
                          }
                        } else if (isPicked) {
                          style = 'bg-slate-900 border-slate-900 text-white';
                        }

                        return (
                          <button
                            key={oIdx}
                            disabled={isAnswered}
                            onClick={() => setSelectedOption(oIdx)}
                            className={`w-full p-4 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between ${style}`}
                          >
                            <span>{opt}</span>
                            {isAnswered && isRight && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                            {isAnswered && isPicked && !isRight && (
                              <XCircle className="w-5 h-5 text-rose-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* QUESTION TYPE 2: FILL IN THE BLANK */}
                  {currentQuestion.type === 'fill-blank' && (
                    <div className="space-y-4 pt-2">
                      {currentQuestion.targetSentence && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                          <p className="text-lg font-medium text-slate-800">
                            {currentQuestion.targetSentence}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={fillBlankInput}
                          disabled={isAnswered}
                          onChange={(e) => setFillBlankInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isAnswered && fillBlankInput.trim()) {
                              handleCheckAnswer();
                            }
                          }}
                          placeholder="Type the missing word..."
                          className="flex-1 p-3.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* QUESTION TYPE 3: WORD ORDER UNSCRAMBLER */}
                  {currentQuestion.type === 'word-order' && (
                    <div className="space-y-5 pt-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <ListOrdered className="w-4 h-4" />
                        <span>Construct the Sentence:</span>
                      </div>

                      {/* Assembled sentence drop/click area */}
                      <div className="min-h-[64px] p-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 flex flex-wrap gap-2 items-center">
                        {orderedWords.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">
                            Tap words below in grammatical order...
                          </span>
                        ) : (
                          orderedWords.map((word, wIdx) => (
                            <button
                              key={`ord-${wIdx}`}
                              disabled={isAnswered}
                              onClick={() => {
                                // Remove word from sequence
                                setOrderedWords((prev) => prev.filter((_, i) => i !== wIdx));
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-rose-300 hover:text-rose-600 rounded-lg text-sm font-medium shadow-2xs transition-colors"
                              title="Tap to remove"
                            >
                              {word}
                            </button>
                          ))
                        )}
                      </div>

                      {/* Available word tiles pool */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {availablePool.map((word, pIdx) => (
                          <button
                            key={`pool-${pIdx}`}
                            disabled={isAnswered}
                            onClick={() => {
                              setOrderedWords((prev) => [...prev, word]);
                            }}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-sm font-semibold rounded-lg transition-colors shadow-2xs"
                          >
                            {word}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* QUESTION TYPE 4: ERROR FIX */}
                  {currentQuestion.type === 'error-fix' && (
                    <div className="space-y-4 pt-2">
                      <div className="bg-rose-50/60 border border-rose-200/70 rounded-xl p-5">
                        <div className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-1">
                          Incorrect Sentence
                        </div>
                        <p className="text-base font-semibold text-rose-950">
                          {currentQuestion.prompt}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">
                          Correct word or form:
                        </label>
                        <input
                          type="text"
                          value={errorFixInput}
                          disabled={isAnswered}
                          onChange={(e) => setErrorFixInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isAnswered && errorFixInput.trim()) {
                              handleCheckAnswer();
                            }
                          }}
                          placeholder="Type the corrected word..."
                          className="w-full p-3.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Feedback Explanation Banner */}
                  {isAnswered && (
                    <div
                      className={`p-5 rounded-xl border space-y-3 animate-in fade-in duration-200 ${
                        isCorrect
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50/70 border-rose-200 text-rose-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          {isCorrect ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              <span>Correct! Excellent grammar intuition.</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-rose-600" />
                              <span>Incorrect. Review the rule below.</span>
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => onOpenAITutor(currentQuestion, selectedTopic)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-800 hover:text-emerald-700 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ask AI Tutor</span>
                        </button>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-700">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  )}

                  {/* Footer Action Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      onClick={() => onOpenAITutor(currentQuestion, selectedTopic)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Deep-dive with AI Tutor</span>
                    </button>

                    {!isAnswered ? (
                      <button
                        onClick={handleCheckAnswer}
                        disabled={
                          currentQuestion.type === 'multiple-choice'
                            ? selectedOption === null
                            : currentQuestion.type === 'fill-blank'
                            ? !fillBlankInput.trim()
                            : currentQuestion.type === 'word-order'
                            ? orderedWords.length === 0
                            : !errorFixInput.trim()
                        }
                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuestion}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                      >
                        <span>Continue</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
