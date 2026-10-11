import React, { useState, useEffect } from 'react';
import {
  SupportedLanguageCode,
  VocabWord,
  UserStats,
  GrammarTopic,
  GrammarQuestion,
} from './types';
import {
  getStoredLanguage,
  saveStoredLanguage,
  getVocabularyForLanguage,
  saveVocabularyForLanguage,
  getUserStats,
  addXp,
} from './services/storage';
import { ExplainParams } from './services/gemini';
import { isSoundEffectsEnabled, setSoundEffectsEnabled, playCorrectSound } from './services/audio';
import { SUPPORTED_LANGUAGES } from './data/languages';
import { Navbar, ActiveTab } from './components/Navbar';
import { DailyVocabPractice } from './components/DailyVocabPractice';
import { InteractiveGrammarQuiz } from './components/InteractiveGrammarQuiz';
import { SentenceLab } from './components/SentenceLab';
import { VocabBank } from './components/VocabBank';
import { WeakSpotLab } from './components/WeakSpotLab';
import { AITutorModal } from './components/AITutorModal';
import { AIDrillGeneratorModal } from './components/AIDrillGeneratorModal';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import {
  Target,
  Flame,
  Award,
  BookOpen,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguageCode>(getStoredLanguage);
  const [activeTab, setActiveTab] = useState<ActiveTab>('vocab');
  const [vocabulary, setVocabulary] = useState<VocabWord[]>(() =>
    getVocabularyForLanguage(selectedLanguage)
  );
  const [stats, setStats] = useState<UserStats>(getUserStats);
  const [customTopics, setCustomTopics] = useState<GrammarTopic[]>([]);

  // Modals state
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isAIDrillModalOpen, setIsAIDrillModalOpen] = useState(false);
  const [isAITutorModalOpen, setIsAITutorModalOpen] = useState(false);
  const [aiTutorParams, setAiTutorParams] = useState<ExplainParams | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(isSoundEffectsEnabled);

  const handleToggleAudio = () => {
    const nextState = !isAudioEnabled;
    setIsAudioEnabled(nextState);
    setSoundEffectsEnabled(nextState);
    if (nextState) {
      playCorrectSound();
    }
  };

  // Sync vocabulary when language changes
  useEffect(() => {
    saveStoredLanguage(selectedLanguage);
    setVocabulary(getVocabularyForLanguage(selectedLanguage));
  }, [selectedLanguage]);

  const handleUpdateWords = (updated: VocabWord[]) => {
    setVocabulary(updated);
    saveVocabularyForLanguage(selectedLanguage, updated);
  };

  const handleAddXp = (amount: number, wordCount = 0, quizCount = 0) => {
    const updated = addXp(amount, wordCount, quizCount);
    setStats(updated);
  };

  const handleSelectLanguage = (code: SupportedLanguageCode) => {
    setSelectedLanguage(code);
  };

  // Open AI Tutor for a vocabulary item
  const handleOpenAITutorForWord = (word: VocabWord) => {
    const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
    setAiTutorParams({
      targetPhrase: word.word,
      language: currentLang?.name || 'Spanish',
      nativeMeaning: word.translation,
      contextSentence: word.exampleSentence,
      grammarConcept: `${word.partOfSpeech} usage and common collocations`,
      userQuery: `Explain the grammatical nuances, origins, and natural usage of "${word.word}" in ${currentLang?.name}.`,
    });
    setIsAITutorModalOpen(true);
  };

  // Open AI Tutor for a grammar question
  const handleOpenAITutorForGrammar = (question: GrammarQuestion, topic: GrammarTopic) => {
    const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
    setAiTutorParams({
      targetPhrase: question.prompt,
      language: currentLang?.name || 'Spanish',
      nativeMeaning: question.correctWord || question.correctedPart || (question.options ? question.options[question.correctOptionIndex || 0] : ''),
      contextSentence: question.targetSentence || question.prompt,
      grammarConcept: topic.title,
      userQuery: `Why is this correct in ${topic.title}? Please explain the grammatical rule: ${question.explanation}`,
    });
    setIsAITutorModalOpen(true);
  };

  // Open AI Tutor for a sentence in SentenceLab
  const handleOpenAITutorForSentence = (sentence: string, english: string, explanation: string) => {
    const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
    setAiTutorParams({
      targetPhrase: sentence,
      language: currentLang?.name || 'Spanish',
      nativeMeaning: english,
      contextSentence: sentence,
      grammarConcept: 'Sentence Syntax and Word Order',
      userQuery: `Break down the syntax and word order for this sentence: "${sentence}". Rule: ${explanation}`,
    });
    setIsAITutorModalOpen(true);
  };

  // Open AI Tutor for WeakSpotLab
  const handleOpenAITutorForMistake = (
    title: string,
    subtitle: string,
    answer: string,
    explanation: string
  ) => {
    const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
    setAiTutorParams({
      targetPhrase: title,
      language: currentLang?.name || 'Spanish',
      nativeMeaning: answer,
      contextSentence: subtitle,
      grammarConcept: 'Error remediation',
      userQuery: `I got this wrong: "${title}". Correct was "${answer}". Explanation was: "${explanation}". Please explain how I can avoid this mistake in the future.`,
    });
    setIsAITutorModalOpen(true);
  };

  const handleTopicGenerated = (newTopic: GrammarTopic) => {
    setCustomTopics((prev) => [newTopic, ...prev]);
    setActiveTab('grammar');
  };

  // Level computation: 100 XP per level
  const userLevel = Math.floor((stats.totalXp || 120) / 100) + 1;
  const levelProgress = (stats.totalXp || 120) % 100;

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Bar Contract Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedLanguage={selectedLanguage}
        onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
        streakDays={stats.streakDays}
        totalXp={stats.totalXp}
        onOpenAIDrillModal={() => setIsAIDrillModalOpen(true)}
        isAudioEnabled={isAudioEnabled}
        onToggleAudio={handleToggleAudio}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Subtle Daily Progress & Focus Banner */}
        <section aria-label="Daily Progress" className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Language & Status */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-emerald-800 flex items-center gap-1">
                  <span>{currentLangObj.flag}</span>
                  <span>{currentLangObj.name} Path</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Level {userLevel} Learner</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-600">{currentLangObj.tagline}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Daily Language Mastery
              </h1>
            </div>

            {/* Right: Daily Target Strip */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
              {/* Daily Word Practice Progress */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Daily Vocab Goal</div>
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    {stats.wordsReviewedToday} / {stats.dailyGoalWords} words
                  </div>
                </div>
              </div>

              {/* Daily Grammar Quizzes Progress */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Grammar Quizzes</div>
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    {stats.quizzesCompletedToday} / {stats.dailyGoalQuizzes} completed
                  </div>
                </div>
              </div>

              {/* Streak Counter */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Daily Streak</div>
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    {stats.streakDays} {stats.streakDays === 1 ? 'day' : 'days'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* XP Progress Bar to next level */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
              Level {userLevel} Progress:
            </span>
            <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums font-semibold text-slate-600">
              {levelProgress}/100 XP to Level {userLevel + 1}
            </span>
          </div>
        </section>

        {/* View Switcher based on active tab */}
        <div className="pt-2">
          {activeTab === 'vocab' && (
            <DailyVocabPractice
              words={vocabulary}
              onUpdateWords={handleUpdateWords}
              selectedLanguage={selectedLanguage}
              onAddXp={handleAddXp}
              onOpenAITutor={handleOpenAITutorForWord}
              onNavigateToGrammar={() => setActiveTab('grammar')}
            />
          )}

          {activeTab === 'grammar' && (
            <InteractiveGrammarQuiz
              selectedLanguage={selectedLanguage}
              onAddXp={handleAddXp}
              onOpenAITutor={handleOpenAITutorForGrammar}
              customTopics={customTopics}
            />
          )}

          {activeTab === 'sentence' && (
            <SentenceLab
              selectedLanguage={selectedLanguage}
              onAddXp={handleAddXp}
              onOpenAITutorSentence={handleOpenAITutorForSentence}
            />
          )}

          {activeTab === 'bank' && (
            <VocabBank
              words={vocabulary}
              onUpdateWords={handleUpdateWords}
              selectedLanguage={selectedLanguage}
              onOpenAITutor={handleOpenAITutorForWord}
            />
          )}

          {activeTab === 'weakspots' && (
            <WeakSpotLab
              selectedLanguage={selectedLanguage}
              onOpenAITutorExplanation={handleOpenAITutorForMistake}
              onAddXp={handleAddXp}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">LinguaPulse</span>
            <span aria-hidden="true">·</span>
            <span>Spaced Repetition Vocabulary & Interactive Grammar Mastery</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLanguageModalOpen(true)}
              className="hover:text-slate-900 transition-colors"
            >
              Change Language ({currentLangObj.name})
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsAIDrillModalOpen(true)}
              className="hover:text-slate-900 transition-colors text-emerald-700 font-medium"
            >
              AI Drill Generator
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LanguageSelectorModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleSelectLanguage}
      />

      <AIDrillGeneratorModal
        isOpen={isAIDrillModalOpen}
        onClose={() => setIsAIDrillModalOpen(false)}
        selectedLanguage={selectedLanguage}
        onTopicGenerated={handleTopicGenerated}
      />

      <AITutorModal
        isOpen={isAITutorModalOpen}
        onClose={() => setIsAITutorModalOpen(false)}
        initialParams={aiTutorParams}
        selectedLanguage={selectedLanguage}
      />
    </div>
  );
}
