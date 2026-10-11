import React, { useState } from 'react';
import { VocabWord, SupportedLanguageCode } from '../types';
import { playAudio } from '../services/audio';
import {
  Search,
  Volume2,
  Bookmark,
  Sparkles,
  Plus,
  X,
  Filter,
} from 'lucide-react';

interface VocabBankProps {
  words: VocabWord[];
  onUpdateWords: (updated: VocabWord[]) => void;
  selectedLanguage: SupportedLanguageCode;
  onOpenAITutor: (word: VocabWord) => void;
}

export const VocabBank: React.FC<VocabBankProps> = ({
  words,
  onUpdateWords,
  selectedLanguage,
  onOpenAITutor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMastery, setFilterMastery] = useState<'all' | 'new' | 'learning' | 'mastered' | 'bookmarked'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New word form state
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newCategory, setNewCategory] = useState('Everyday');
  const [newExample, setNewExample] = useState('');
  const [newExampleTrans, setNewExampleTrans] = useState('');
  const [newMnemonic, setNewMnemonic] = useState('');

  // Filtering
  const filteredWords = words.filter((w) => {
    const matchesSearch =
      w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.translation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMastery === 'bookmarked') return Boolean(w.isBookmarked);
    if (filterMastery !== 'all') return w.masteryLevel === filterMastery;
    return true;
  });

  const handleToggleBookmark = (id: string) => {
    const updated = words.map((w) => (w.id === id ? { ...w, isBookmarked: !w.isBookmarked } : w));
    onUpdateWords(updated);
  };

  const handleAddCustomWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newTranslation.trim()) return;

    const created: VocabWord = {
      id: `custom-${Date.now()}`,
      language: selectedLanguage,
      word: newWord.trim(),
      translation: newTranslation.trim(),
      partOfSpeech: 'noun',
      category: newCategory.trim() || 'General',
      exampleSentence: newExample.trim() || `${newWord.trim()}.`,
      exampleTranslation: newExampleTrans.trim() || `${newTranslation.trim()}.`,
      mnemonic: newMnemonic.trim(),
      masteryLevel: 'new',
      repetitions: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString().split('T')[0],
      timesCorrect: 0,
      timesIncorrect: 0,
    };

    onUpdateWords([created, ...words]);
    setNewWord('');
    setNewTranslation('');
    setNewExample('');
    setNewExampleTrans('');
    setNewMnemonic('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Vocabulary Glossary</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="tabular-nums font-semibold text-slate-800">{words.length} Total Words</span>
            <span aria-hidden="true">·</span>
            <span>Spaced Repetition Stats</span>
            <span aria-hidden="true">·</span>
            <span>Personal Bookmarks</span>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Word</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search word, meaning, or category..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {(['all', 'mastered', 'learning', 'new', 'bookmarked'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterMastery(lvl)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors capitalize ${
                filterMastery === lvl
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Words Grid */}
      {filteredWords.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 space-y-2">
          <p className="font-semibold text-slate-700">No matching vocabulary found</p>
          <p className="text-xs">Try clearing filters or search terms</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-2xs space-y-3 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 tracking-tight">
                      {item.word}
                    </h4>
                    {item.transliteration && (
                      <p className="text-xs text-slate-400 font-mono">{item.transliteration}</p>
                    )}
                    <p className="text-sm font-medium text-emerald-800 mt-0.5">
                      {item.translation}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => playAudio(item.word, selectedLanguage)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      title="Pronounce"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleBookmark(item.id)}
                      className={`p-1.5 rounded-md transition-colors ${
                        item.isBookmarked
                          ? 'text-amber-500 hover:bg-amber-50'
                          : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                      }`}
                      title="Bookmark"
                    >
                      <Bookmark className={`w-4 h-4 ${item.isBookmarked ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Example sentence */}
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1">
                  <p className="font-medium text-slate-800">{item.exampleSentence}</p>
                  <p className="text-slate-500">{item.exampleTranslation}</p>
                </div>
              </div>

              {/* Bottom Metadata */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.masteryLevel === 'mastered'
                        ? 'bg-emerald-500'
                        : item.masteryLevel === 'learning'
                        ? 'bg-sky-500'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="capitalize text-slate-600 font-medium">{item.masteryLevel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{item.intervalDays}d interval</span>
                </div>

                <button
                  onClick={() => onOpenAITutor(item)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Explain</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Custom Word Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add Custom Vocabulary Card</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomWord} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Target Word *</label>
                  <input
                    type="text"
                    required
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="e.g. la sobremesa"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">English Translation *</label>
                  <input
                    type="text"
                    required
                    value={newTranslation}
                    onChange={(e) => setNewTranslation(e.target.value)}
                    placeholder="e.g. after-dinner conversation"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Category</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Culture, Dining, Travel"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Example Sentence</label>
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="e.g. Disfrutamos de una larga sobremesa."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Example Translation</label>
                <input
                  type="text"
                  value={newExampleTrans}
                  onChange={(e) => setNewExampleTrans(e.target.value)}
                  placeholder="e.g. We enjoyed a long after-dinner conversation."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Memory Mnemonic (Optional)</label>
                <input
                  type="text"
                  value={newMnemonic}
                  onChange={(e) => setNewMnemonic(e.target.value)}
                  placeholder="e.g. Sobre (over) + mesa (table) = conversation over the table"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
