import React from 'react';
import { SupportedLanguageCode, Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { X, Check } from 'lucide-react';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: SupportedLanguageCode;
  onSelectLanguage: (code: SupportedLanguageCode) => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onSelectLanguage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Choose Target Language</h3>
            <p className="text-xs text-slate-500">
              Vocabulary decks & grammar rules update automatically
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 py-1">
          {SUPPORTED_LANGUAGES.map((lang: Language) => {
            const isSelected = lang.code === selectedLanguage;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  onSelectLanguage(lang.code);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{lang.flag}</span>
                  <div>
                    <div className="text-sm font-semibold">{lang.name}</div>
                    <div className="text-xs text-slate-500 font-normal">{lang.nativeName}</div>
                  </div>
                </div>

                {isSelected && <Check className="w-5 h-5 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
