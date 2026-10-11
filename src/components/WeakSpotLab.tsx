import React, { useState } from 'react';
import { WeakSpotItem, SupportedLanguageCode } from '../types';
import { getWeakSpots, removeWeakSpot } from '../services/storage';
import { playAudio, playCorrectSound, playIncorrectSound } from '../services/audio';
import {
  AlertCircle,
  CheckCircle2,
  Trash2,
  RotateCw,
  Volume2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface WeakSpotLabProps {
  selectedLanguage: SupportedLanguageCode;
  onOpenAITutorExplanation: (title: string, subtitle: string, answer: string, explanation: string) => void;
  onAddXp: (amount: number, wordCount: number) => void;
}

export const WeakSpotLab: React.FC<WeakSpotLabProps> = ({
  selectedLanguage,
  onOpenAITutorExplanation,
  onAddXp,
}) => {
  const [items, setItems] = useState<WeakSpotItem[]>(() => {
    return getWeakSpots().filter((i) => i.language === selectedLanguage);
  });
  const [filterType, setFilterType] = useState<'all' | 'vocab' | 'grammar'>('all');
  const [testingItem, setTestingItem] = useState<WeakSpotItem | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testFeedback, setTestFeedback] = useState<'correct' | 'wrong' | null>(null);

  const filtered = items.filter((i) => {
    if (filterType === 'all') return true;
    return i.type === filterType;
  });

  const handleDismiss = (id: string) => {
    removeWeakSpot(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleStartTest = (item: WeakSpotItem) => {
    setTestingItem(item);
    setTestInput('');
    setTestFeedback(null);
  };

  const handleVerifyTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testingItem) return;

    const cleanInput = testInput.trim().toLowerCase();
    const cleanTarget = testingItem.correctAnswer.trim().toLowerCase();

    if (cleanInput === cleanTarget || cleanTarget.includes(cleanInput)) {
      playCorrectSound();
      setTestFeedback('correct');
      onAddXp(20, 1);
      setTimeout(() => {
        handleDismiss(testingItem.id);
        setTestingItem(null);
      }, 1000);
    } else {
      playIncorrectSound();
      setTestFeedback('wrong');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Mistake & Weak Spot Lab</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="tabular-nums font-semibold text-rose-700">
              {filtered.length} items needing reinforcement
            </span>
            <span aria-hidden="true">·</span>
            <span>Error Recovery Protocol</span>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['all', 'vocab', 'grammar'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors capitalize ${
                filterType === type
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type === 'all' ? 'All Mistakes' : type === 'vocab' ? 'Vocabulary' : 'Grammar'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Zero Mistakes Outstanding!</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            You have mastered your previous tricky items. Any words you rate "Again" or quiz questions you get wrong will automatically appear here for deliberate practice.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="uppercase font-semibold tracking-wider text-rose-700">
                      {item.type}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">Missed {item.timesFailed}x</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                  <p className="text-sm text-slate-600">{item.subtitle}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => playAudio(item.title, selectedLanguage)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Audio"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleStartTest(item)}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                  >
                    Drill Now
                  </button>
                  <button
                    onClick={() => handleDismiss(item.id)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Mark resolved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Correct answer and explanation */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs space-y-1">
                <div>
                  <span className="font-semibold text-slate-700">Correct Target: </span>
                  <span className="font-bold text-emerald-800">{item.correctAnswer}</span>
                </div>
                {item.explanation && (
                  <p className="text-slate-600 leading-relaxed">{item.explanation}</p>
                )}
              </div>

              {/* AI Tutor Breakdown Link */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={() =>
                    onOpenAITutorExplanation(
                      item.title,
                      item.subtitle,
                      item.correctAnswer,
                      item.explanation
                    )
                  }
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Explain why I missed this</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drill Active Modal */}
      {testingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Reinforce Weak Spot</h3>
              <button
                onClick={() => setTestingItem(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-center space-y-1 py-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Question Prompt</p>
                <h4 className="text-xl font-bold text-slate-900">{testingItem.subtitle || testingItem.title}</h4>
              </div>

              <form onSubmit={handleVerifyTest} className="space-y-3">
                <input
                  type="text"
                  autoFocus
                  required
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Type the correct target answer..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                {testFeedback === 'wrong' && (
                  <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                    Not quite. Expected: <strong>{testingItem.correctAnswer}</strong>. Try again!
                  </div>
                )}
                {testFeedback === 'correct' && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg font-semibold">
                    Mastered! Item cleared from Weak Spots.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTestingItem(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                  >
                    Check & Clear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
