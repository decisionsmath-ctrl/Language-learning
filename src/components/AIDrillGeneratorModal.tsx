import React, { useState } from 'react';
import { GrammarTopic, SupportedLanguageCode } from '../types';
import { generateAIDrill } from '../services/gemini';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { Sparkles, X, Loader2, Check } from 'lucide-react';

interface AIDrillGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: SupportedLanguageCode;
  onTopicGenerated: (topic: GrammarTopic) => void;
}

export const AIDrillGeneratorModal: React.FC<AIDrillGeneratorModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onTopicGenerated,
}) => {
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleTopics: Record<SupportedLanguageCode, string[]> = {
    es: [
      'Subjunctive with doubt & uncertainty',
      'Direct & Indirect Object Pronouns together (se lo)',
      'Preterite vs Imperfect aspectual nuances',
      'Reflexive verbs for unintentional events (se me cayó)',
    ],
    fr: [
      'Pronoun replacement with En and Y',
      'Subjunctive triggers after feelings & wishes',
      'Passé Composé vs Imparfait in storytelling',
      'Relative pronouns ce qui, ce que, ce dont',
    ],
    de: [
      'Two-way prepositions (Wechselpräpositionen)',
      'Subordinate clauses with weil, dass, obwohl',
      'Adjective endings after indefinite articles',
      'Modal verbs in the Simple Past (Präteritum)',
    ],
    ja: [
      'Te-form connections and sequential actions',
      'Potential form (can do / able to)',
      'Particles に vs で in complex sentences',
      'Giving and receiving verbs (ageru, kureru, morau)',
    ],
    it: [
      'Articulated prepositions (del, al, dal, nel, sul)',
      'Passato Prossimo agreement with direct object pronouns',
      'Congiuntivo Presente with opinions and doubts',
      'Piacere and indirect pronoun constructions',
    ],
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await generateAIDrill({
        language: currentLang.name,
        topic: topic.trim(),
        difficulty,
        count: questionCount,
      });

      const newGrammarTopic: GrammarTopic = {
        id: `ai-${Date.now()}`,
        language: selectedLanguage,
        title: response.topicTitle || topic,
        category: 'AI Custom Mastery',
        level: difficulty === 'Beginner' ? 'A1' : difficulty === 'Intermediate' ? 'B1' : 'B2',
        overview: response.overview || `AI-generated targeted drill focusing on ${topic}.`,
        keyRule: response.cheatSheetRule || `Master the grammatical pattern of ${topic}.`,
        quickTips: [
          'Take your time to read the full context sentence.',
          'Notice how auxiliary forms agree with the subject.',
        ],
        questions: (response.questions || []).map((q: any, i: number) => ({
          id: `ai-q-${Date.now()}-${i}`,
          topicId: `ai-${Date.now()}`,
          type: q.type || 'multiple-choice',
          prompt: q.prompt,
          targetSentence: q.targetSentence,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          correctWord: q.correctWord,
          wordsToOrder: q.wordsToOrder,
          correctOrder: q.correctOrder,
          errorPart: q.errorPart,
          correctedPart: q.correctedPart,
          explanation: q.explanation,
        })),
      };

      onTopicGenerated(newGrammarTopic);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate custom drill. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">AI Drill Generator</h3>
              <p className="text-xs text-slate-500">
                Generate interactive grammar & vocab quizzes on any custom topic
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Topic input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Grammar Concept or Topic ({currentLang.name})
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Por vs Para, Two-way prepositions, Subjunctive..."
              className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Preset topic quick picks */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Suggested Topics
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(sampleTopics[selectedLanguage] || []).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopic(preset)}
                  className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md border border-slate-200 text-left transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setDifficulty(lvl)}
                className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                  difficulty === lvl
                    ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Question count */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Question Count:</span>
              <span className="tabular-nums font-bold text-slate-900">{questionCount} Questions</span>
            </div>
            <input
              type="range"
              min={3}
              max={8}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Drill...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Interactive Quiz</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
