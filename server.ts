import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Explain grammar or vocabulary concept
app.post('/api/gemini/explain', async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is provided.',
      });
    }

    const { targetPhrase, language, nativeMeaning, contextSentence, grammarConcept, userQuery } = req.body;

    const prompt = `You are an expert language teacher and polyglot linguist.
Target Language: ${language || 'Spanish'}
Target Word or Phrase: "${targetPhrase || ''}"
English Translation: "${nativeMeaning || ''}"
Context Sentence: "${contextSentence || ''}"
Grammar Concept: "${grammarConcept || 'General Grammar & Usage'}"
User Specific Question: "${userQuery || 'Please explain why this works, key grammar rules, common mistakes, and how to remember it.'}"

Provide a clear, engaging, pedagogical explanation in structured JSON.
Ensure explanations are concise, encouraging, and accurate.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Short concept title' },
            summary: { type: Type.STRING, description: 'Direct 1-2 sentence core explanation' },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  component: { type: Type.STRING, description: 'Part of word or phrase' },
                  meaning: { type: Type.STRING, description: 'Function or literal meaning' },
                },
                required: ['component', 'meaning'],
              },
              description: 'Step-by-step morphological or syntactic breakdown',
            },
            keyRule: { type: Type.STRING, description: 'The golden rule to remember' },
            commonPitfalls: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '1-2 frequent errors native English speakers make',
            },
            exampleSentences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  target: { type: Type.STRING, description: 'Sentence in target language' },
                  translation: { type: Type.STRING, description: 'English translation' },
                  note: { type: Type.STRING, description: 'Grammar note for this example' },
                },
                required: ['target', 'translation'],
              },
              description: '2 practical example sentences demonstrating the concept',
            },
            mnemonic: { type: Type.STRING, description: 'Memorable tip, trick, or rhyme' },
          },
          required: ['title', 'summary', 'keyRule', 'commonPitfalls', 'exampleSentences'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating explanation:', error);
    return res.status(500).json({
      error: 'Failed to generate explanation. Please try again.',
      details: error.message,
    });
  }
});

// Generate dynamic interactive grammar quiz or vocabulary drill
app.post('/api/gemini/generate-drill', async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is provided.',
      });
    }

    const { language = 'Spanish', topic = 'Present Subjunctive', difficulty = 'Intermediate', count = 5 } = req.body;

    const prompt = `Create an interactive grammar & vocabulary practice drill for learners.
Language: ${language}
Topic: ${topic}
Level: ${difficulty}
Number of questions: ${Math.min(Number(count) || 5, 8)}

Create a balanced mix of question types:
1. "multiple-choice" (pick the correct grammatical conjugation or word)
2. "fill-blank" (fill in the missing word)
3. "word-order" (rearrange words to form a correct sentence)
4. "error-fix" (identify and correct the grammatical error in a sentence)

Return clean structured JSON matching the schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topicTitle: { type: Type.STRING },
            overview: { type: Type.STRING, description: 'Brief 1-2 sentence overview of this grammar topic' },
            cheatSheetRule: { type: Type.STRING, description: 'Key rule formula or pattern' },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: {
                    type: Type.STRING,
                    description: 'One of: multiple-choice, fill-blank, word-order, error-fix',
                  },
                  prompt: { type: Type.STRING, description: 'The question instructions or English context' },
                  targetSentence: { type: Type.STRING, description: 'The sentence with blank ___ or full sentence' },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Options for multiple-choice or fill-blank',
                  },
                  correctOptionIndex: { type: Type.INTEGER, description: '0-based index of correct option' },
                  correctWord: { type: Type.STRING, description: 'For fill-blank, the exact correct word' },
                  wordsToOrder: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Scrambled words for word-order question type',
                  },
                  correctOrder: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Target correct order of the words',
                  },
                  errorPart: { type: Type.STRING, description: 'For error-fix, the incorrect word or fragment' },
                  correctedPart: { type: Type.STRING, description: 'The correct replacement' },
                  explanation: { type: Type.STRING, description: 'Why this is correct and the grammar rule behind it' },
                },
                required: ['id', 'type', 'prompt', 'explanation'],
              },
            },
          },
          required: ['topicTitle', 'overview', 'cheatSheetRule', 'questions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating drill:', error);
    return res.status(500).json({
      error: 'Failed to generate custom drill.',
      details: error.message,
    });
  }
});

// Gemini TTS speech endpoint (with gemini-3.8-flash-lite-tts)
app.post('/api/gemini/pronounce', async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API not configured' });
    }

    const { text, language = 'es' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Pronounce naturally in ${language}: "${text}"`,
              speechMetadata: {
                style: 'Clear, natural, patient language instructor pronunciation',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({ audioData: base64Audio, format: 'audio/wav' });
    }

    return res.status(500).json({ error: 'No audio returned' });
  } catch (err: any) {
    console.error('TTS error:', err);
    return res.status(500).json({ error: 'TTS generation failed', details: err.message });
  }
});

// Setup Vite middlewares or static files
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LinguaPulse server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
