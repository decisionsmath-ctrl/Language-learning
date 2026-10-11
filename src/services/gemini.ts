import { AITutorResponse, SupportedLanguageCode } from '../types';

export interface ExplainParams {
  targetPhrase: string;
  language: string;
  nativeMeaning?: string;
  contextSentence?: string;
  grammarConcept?: string;
  userQuery?: string;
}

export const askAITutor = async (params: ExplainParams): Promise<AITutorResponse> => {
  const response = await fetch('/api/gemini/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch explanation from AI Tutor');
  }

  return response.json();
};

export interface GenerateDrillParams {
  language: string;
  topic: string;
  difficulty: string;
  count?: number;
}

export const generateAIDrill = async (params: GenerateDrillParams) => {
  const response = await fetch('/api/gemini/generate-drill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate custom drill from AI');
  }

  return response.json();
};
