import React, { useState, useEffect } from 'react';
import { AITutorResponse, SupportedLanguageCode } from '../types';
import { askAITutor, ExplainParams } from '../services/gemini';
import {
  Sparkles,
  X,
  BookOpen,
  AlertTriangle,
  Lightbulb,
  Send,
  Loader2,
  Volume2,
} from 'lucide-react';
import { playAudio } from '../services/audio';

interface AITutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialParams: ExplainParams | null;
  selectedLanguage: SupportedLanguageCode;
}

export const AITutorModal: React.FC<AITutorModalProps> = ({
  isOpen,
  onClose,
  initialParams,
  selectedLanguage,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AITutorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');

  useEffect(() => {
    if (isOpen && initialParams) {
      fetchExplanation(initialParams);
    } else {
      setData(null);
      setError(null);
      setUserQuery('');
    }
  }, [isOpen, initialParams]);

  const fetchExplanation = async (params: ExplainParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await askAITutor(params);
      setData(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not load explanation. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleAskFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || !initialParams) return;
    fetchExplanation({
      ...initialParams,
      userQuery: userQuery.trim(),
    });
    setUserQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">AI Linguistic Tutor</h3>
              <p className="text-xs text-slate-500">
                In-depth grammatical breakdown & native usage nuances
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

        {/* Loading state */}
        {loading && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-700">
              Analyzing grammatical roots and structure...
            </p>
            <p className="text-xs text-slate-400">
              Generating contextual examples & memory mnemonics
            </p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-center">
            <p className="text-xs font-semibold text-rose-800">{error}</p>
            <button
              onClick={() => initialParams && fetchExplanation(initialParams)}
              className="text-xs font-semibold text-rose-900 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Explanation Data */}
        {!loading && data && (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
            {/* Title & Core Summary */}
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-slate-900">{data.title}</h4>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {data.summary}
              </p>
            </div>

            {/* Word Breakdown */}
            {data.breakdown && data.breakdown.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Component Breakdown</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.breakdown.map((item, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs flex justify-between gap-2"
                    >
                      <span className="font-semibold text-slate-900">{item.component}</span>
                      <span className="text-slate-600 text-right">{item.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Golden Rule */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                The Golden Rule
              </div>
              <p className="text-xs font-medium text-emerald-950 leading-relaxed">{data.keyRule}</p>
            </div>

            {/* Common Pitfalls */}
            {data.commonPitfalls && data.commonPitfalls.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Common Pitfalls to Avoid</span>
                </h5>
                <ul className="space-y-1.5">
                  {data.commonPitfalls.map((p, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Example Sentences */}
            {data.exampleSentences && data.exampleSentences.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Real Context Examples
                </h5>
                <div className="space-y-2">
                  {data.exampleSentences.map((ex, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{ex.target}</span>
                        <button
                          onClick={() => playAudio(ex.target, selectedLanguage)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-slate-600">{ex.translation}</p>
                      {ex.note && <p className="text-slate-500 italic text-[11px]">{ex.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memory Mnemonic */}
            {data.mnemonic && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-xl space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span>Memory Hook</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">{data.mnemonic}</p>
              </div>
            )}
          </div>
        )}

        {/* Follow-up question input */}
        <form onSubmit={handleAskFollowUp} className="pt-2 border-t border-slate-100 flex gap-2">
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Ask a follow-up question (e.g. 'Can I use this with...')"
            className="flex-1 px-3.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!userQuery.trim() || loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>Ask</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
};
