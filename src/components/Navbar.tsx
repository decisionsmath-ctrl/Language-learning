import React from 'react';
import { SupportedLanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { Sparkles, Flame, ChevronDown, Volume2, VolumeX } from 'lucide-react';

export type ActiveTab = 'vocab' | 'grammar' | 'sentence' | 'bank' | 'weakspots';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedLanguage: SupportedLanguageCode;
  onOpenLanguageModal: () => void;
  streakDays: number;
  totalXp: number;
  onOpenAIDrillModal: () => void;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedLanguage,
  onOpenLanguageModal,
  streakDays,
  totalXp,
  onOpenAIDrillModal,
  isAudioEnabled,
  onToggleAudio,
}) => {
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('vocab')}
              className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap hover:text-emerald-700 transition-colors flex items-center gap-2"
            >
              <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-extrabold shadow-sm">
                LP
              </span>
              <span>LinguaPulse</span>
            </button>
          </div>

          {/* Zone 2: 4–5 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('vocab')}
              className={`whitespace-nowrap pb-1 border-b-2 transition-all ${
                activeTab === 'vocab'
                  ? 'border-emerald-600 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Daily Vocab
            </button>
            <button
              onClick={() => setActiveTab('grammar')}
              className={`whitespace-nowrap pb-1 border-b-2 transition-all ${
                activeTab === 'grammar'
                  ? 'border-emerald-600 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Grammar Quizzes
            </button>
            <button
              onClick={() => setActiveTab('sentence')}
              className={`whitespace-nowrap pb-1 border-b-2 transition-all ${
                activeTab === 'sentence'
                  ? 'border-emerald-600 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Sentence Lab
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`whitespace-nowrap pb-1 border-b-2 transition-all ${
                activeTab === 'bank'
                  ? 'border-emerald-600 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Word Bank
            </button>
            <button
              onClick={() => setActiveTab('weakspots')}
              className={`whitespace-nowrap pb-1 border-b-2 transition-all ${
                activeTab === 'weakspots'
                  ? 'border-emerald-600 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Mistake Lab
            </button>
          </nav>

          {/* Zone 3: 1 primary action cluster */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Streak & XP display */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600 pr-2 border-r border-slate-200">
              <span className="flex items-center gap-1 font-medium text-amber-700">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="tabular-nums font-semibold">{streakDays}</span>
                <span>day streak</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="tabular-nums font-semibold text-slate-700">
                {totalXp} XP
              </span>
            </div>

            {/* AI Generator CTA */}
            <button
              onClick={onOpenAIDrillModal}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap"
              title="Generate custom practice drills with AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Quiz Generator</span>
            </button>

            {/* Sound Feedback Toggle Button */}
            <button
              onClick={onToggleAudio}
              className={`p-2 rounded-lg transition-colors ${
                isAudioEnabled
                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                  : 'text-slate-400 bg-slate-100 hover:bg-slate-200 border border-slate-200'
              }`}
              title={isAudioEnabled ? 'Answer sound feedback is ON (Click to mute)' : 'Answer sound feedback is MUTED (Click to unmute)'}
              aria-label={isAudioEnabled ? 'Mute answer sounds' : 'Unmute answer sounds'}
            >
              {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Language Selector Button */}
            <button
              onClick={onOpenLanguageModal}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              aria-label="Switch language"
            >
              <span className="text-base leading-none">{currentLang.flag}</span>
              <span className="font-semibold">{currentLang.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-100 py-2 text-xs font-medium text-slate-600 overflow-x-auto">
          <button
            onClick={() => setActiveTab('vocab')}
            className={`px-2 py-1 whitespace-nowrap ${
              activeTab === 'vocab' ? 'text-emerald-700 font-bold border-b-2 border-emerald-600' : ''
            }`}
          >
            Vocab
          </button>
          <button
            onClick={() => setActiveTab('grammar')}
            className={`px-2 py-1 whitespace-nowrap ${
              activeTab === 'grammar' ? 'text-emerald-700 font-bold border-b-2 border-emerald-600' : ''
            }`}
          >
            Grammar
          </button>
          <button
            onClick={() => setActiveTab('sentence')}
            className={`px-2 py-1 whitespace-nowrap ${
              activeTab === 'sentence' ? 'text-emerald-700 font-bold border-b-2 border-emerald-600' : ''
            }`}
          >
            Sentences
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-2 py-1 whitespace-nowrap ${
              activeTab === 'bank' ? 'text-emerald-700 font-bold border-b-2 border-emerald-600' : ''
            }`}
          >
            Word Bank
          </button>
          <button
            onClick={() => setActiveTab('weakspots')}
            className={`px-2 py-1 whitespace-nowrap ${
              activeTab === 'weakspots' ? 'text-emerald-700 font-bold border-b-2 border-emerald-600' : ''
            }`}
          >
            Mistakes
          </button>
        </div>
      </div>
    </header>
  );
};
