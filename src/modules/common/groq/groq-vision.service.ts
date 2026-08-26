import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface VisionAnalysisResult {
  confidence: number;
  isAuthentic: boolean;
  tags: string[];
  notes: string;
  matchesQuest: boolean;
  flags: string[];
  rawResponse: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments: number;
}

export interface BatchAnalysisItem {
  id: string;
  type: 'image' | 'text' | 'audio';
  imageUrl?: string;
  text?: string;
  audioBuffer?: Buffer;
  audioMimeType?: string;
  questTitle: string;
  questCategory: string;
  questDescription: string;
}

export interface BatchAnalysisResult {
  id: string;
  analysis: VisionAnalysisResult;
  transcription?: TranscriptionResult;
  duration: number;
}

@Injectable()
export class GroqVisionService {
  private readonly logger = new Logger(GroqVisionService.name);
  private groq: Groq | null = null;
  private readonly visionModel = 'qwen/qwen3.6-27b';
  private readonly whisperModel = 'whisper-large-v3-turbo';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('GROQ_API_KEY');
    if (apiKey && apiKey !== 'gsk_your_groq_api_key_here') {
      this.groq = new Groq({ apiKey });
      this.logger.log('Groq AI initialized — Vision: qwen/qwen3.6-27b, Audio: whisper-large-v3-turbo');
    } else {
      this.logger.warn('GROQ_API_KEY not set — using mock analysis');
    }
  }

  get isAvailable(): boolean {
    return this.groq !== null;
  }

  // ─── ANALYZE IMAGE ────────────────────────────────
  async analyzeImage(
    imageUrl: string,
    questTitle: string,
    questCategory: string,
    questDescription: string,
  ): Promise<VisionAnalysisResult> {
    this.logger.log(`Analyzing image for quest: "${questTitle}"`);

    if (!this.groq) {
      return this.mockAnalysis(questCategory);
    }

    try {
      const prompt = this.buildAnalysisPrompt(questTitle, questCategory, questDescription);

      const completion = await this.groq.chat.completions.create({
        model: this.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_completion_tokens: 1024,
      });

      const response = completion.choices[0]?.message?.content || '';
      this.logger.log(`Groq response: ${response.substring(0, 200)}...`);

      return this.parseAIResponse(response, questCategory);
    } catch (error) {
      this.logger.error(`Groq API error: ${error.message}`);
      // Fallback to mock on error
      return this.mockAnalysis(questCategory);
    }
  }

  // ─── ANALYZE IMAGE FROM BASE64 ────────────────────
  async analyzeImageBase64(
    base64Data: string,
    mimeType: string,
    questTitle: string,
    questCategory: string,
    questDescription: string,
  ): Promise<VisionAnalysisResult> {
    this.logger.log(`Analyzing base64 image for quest: "${questTitle}"`);

    if (!this.groq) {
      return this.mockAnalysis(questCategory);
    }

    try {
      const prompt = this.buildAnalysisPrompt(questTitle, questCategory, questDescription);

      const completion = await this.groq.chat.completions.create({
        model: this.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_completion_tokens: 1024,
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseAIResponse(response, questCategory);
    } catch (error) {
      this.logger.error(`Groq API error: ${error.message}`);
      return this.mockAnalysis(questCategory);
    }
  }

  // ─── ANALYZE TEXT ─────────────────────────────────
  async analyzeText(
    text: string,
    questTitle: string,
    questCategory: string,
    questDescription: string,
  ): Promise<VisionAnalysisResult> {
    this.logger.log(`Analyzing text for quest: "${questTitle}"`);

    if (!this.groq) {
      return this.mockTextAnalysis(text, questCategory);
    }

    try {
      const prompt = `You are an AI verifier for the app Haru. Your job is to verify if a user's text description proves they completed a quest.

QUEST: "${questTitle}"
CATEGORY: ${questCategory}
DESCRIPTION: ${questDescription}

USER'S TEXT EVIDENCE:
"${text}"

Analyze this evidence and respond in EXACTLY this JSON format (no markdown, no code blocks):
{
  "confidence": <0-100 number>,
  "isAuthentic": <true/false>,
  "tags": [<relevant tags>],
  "notes": "<brief analysis>",
  "matchesQuest": <true/false>,
  "flags": [<any warnings>]
}

Rules:
- Confidence 80-100: clearly describes completing the quest
- Confidence 50-79: somewhat relevant but vague
- Confidence 0-49: doesn't match or too short
- Flag "too_short" if under 20 words
- Flag "vague" if no specific details
- Flag "does_not_match_quest" if unrelated`;

      const completion = await this.groq.chat.completions.create({
        model: this.visionModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_completion_tokens: 512,
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseAIResponse(response, questCategory);
    } catch (error) {
      this.logger.error(`Groq API error: ${error.message}`);
      return this.mockTextAnalysis(text, questCategory);
    }
  }

  // ─── TRANSCRIBE AUDIO (Whisper) ──────────────────
  async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string = 'audio/mpeg',
  ): Promise<TranscriptionResult> {
    this.logger.log(`Transcribing audio (${audioBuffer.length} bytes, ${mimeType})`);

    if (!this.groq) {
      return {
        text: '[Mock] Audio transcription not available without Groq API key',
        language: 'es',
        duration: 0,
        segments: 0,
      };
    }

    try {
      // Determine file extension from MIME type
      const extMap: Record<string, string> = {
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/webm': 'webm',
        'audio/mp4': 'mp4',
      };
      const ext = extMap[mimeType] || 'mp3';

      // Create a File-like object for the Groq SDK
      const uint8Array = new Uint8Array(audioBuffer);
      const file = new File([uint8Array], `audio.${ext}`, { type: mimeType });

      const transcription = await this.groq.audio.transcriptions.create({
        file,
        model: this.whisperModel,
        language: 'es',
        response_format: 'verbose_json',
      });

      this.logger.log(`Whisper transcription: ${(transcription as any).text?.substring(0, 100)}...`);

      return {
        text: (transcription as any).text || '',
        language: (transcription as any).language || 'unknown',
        duration: (transcription as any).duration || 0,
        segments: (transcription as any).segments?.length || 0,
      };
    } catch (error) {
      this.logger.error(`Whisper API error: ${error.message}`);
      return {
        text: `[Whisper error: ${error.message}]`,
        language: 'unknown',
        duration: 0,
        segments: 0,
      };
    }
  }

  // ─── ANALYZE AUDIO (transcribe + analyze) ─────────
  async analyzeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    questTitle: string,
    questCategory: string,
    questDescription: string,
  ): Promise<VisionAnalysisResult & { transcription: TranscriptionResult }> {
    this.logger.log(`Analyzing audio for quest: "${questTitle}"`);

    // Step 1: Transcribe with Whisper
    const transcription = await this.transcribeAudio(audioBuffer, mimeType);

    // Step 2: Analyze the transcription text
    const analysis = await this.analyzeText(
      transcription.text,
      questTitle,
      questCategory,
      questDescription,
    );

    return {
      ...analysis,
      transcription,
    };
  }

  // ─── BATCH ANALYSIS ───────────────────────────────
  async analyzeBatch(items: BatchAnalysisItem[]): Promise<BatchAnalysisResult[]> {
    this.logger.log(`Batch analysis: ${items.length} items`);

    const startTime = Date.now();

    // Process all items in parallel
    const results = await Promise.all(
      items.map(async (item) => {
        const itemStart = Date.now();
        let analysis: VisionAnalysisResult;
        let transcription: TranscriptionResult | undefined;

        try {
          switch (item.type) {
            case 'image':
              analysis = await this.analyzeImage(
                item.imageUrl!,
                item.questTitle,
                item.questCategory,
                item.questDescription,
              );
              break;

            case 'text':
              analysis = await this.analyzeText(
                item.text!,
                item.questTitle,
                item.questCategory,
                item.questDescription,
              );
              break;

            case 'audio':
              const audioResult = await this.analyzeAudio(
                item.audioBuffer!,
                item.audioMimeType || 'audio/mpeg',
                item.questTitle,
                item.questCategory,
                item.questDescription,
              );
              analysis = audioResult;
              transcription = audioResult.transcription;
              break;

            default:
              analysis = {
                confidence: 0,
                isAuthentic: false,
                tags: [],
                notes: 'Unknown evidence type',
                matchesQuest: false,
                flags: ['unknown_type'],
                rawResponse: 'unknown',
              };
          }
        } catch (error) {
          this.logger.error(`Batch item ${item.id} failed: ${error.message}`);
          analysis = {
            confidence: 0,
            isAuthentic: false,
            tags: [],
            notes: `Analysis failed: ${error.message}`,
            matchesQuest: false,
            flags: ['analysis_failed'],
            rawResponse: error.message,
          };
        }

        return {
          id: item.id,
          analysis,
          transcription,
          duration: Date.now() - itemStart,
        };
      }),
    );

    const totalDuration = Date.now() - startTime;
    this.logger.log(`Batch analysis complete: ${items.length} items in ${totalDuration}ms (avg: ${Math.round(totalDuration / items.length)}ms/item)`);

    return results;
  }

  // ─── BUILD ANALYSIS PROMPT ────────────────────────
  private buildAnalysisPrompt(
    questTitle: string,
    questCategory: string,
    questDescription: string,
  ): string {
    return `You are an AI verifier for the app Haru. Your job is to verify if a user's photo proves they completed a quest.

QUEST: "${questTitle}"
CATEGORY: ${questCategory}
DESCRIPTION: ${questDescription}

Analyze this image and determine:
1. Does the image show evidence of completing this quest?
2. Is the image authentic (not a screenshot, not recycled from another app)?
3. What objects/concepts are visible?

Respond in EXACTLY this JSON format (no markdown, no code blocks):
{
  "confidence": <0-100 number>,
  "isAuthentic": <true/false>,
  "tags": [<detected objects/concepts>],
  "notes": "<brief analysis of what you see>",
  "matchesQuest": <true/false>,
  "flags": [<any warnings like "possible_screenshot", "blurry", "does_not_match_quest">]
}

Rules:
- Confidence 80-100: clear evidence of quest completion
- Confidence 50-79: partial evidence, needs review
- Confidence 0-49: insufficient or unrelated evidence
- Flag "possible_screenshot" if it looks like a screenshot
- Flag "does_not_match_quest" if the image is unrelated
- Flag "blurry" if image quality is too low
- Be strict but fair — the user is trying to complete a real-world activity`;
  }

  // ─── PARSE AI RESPONSE ────────────────────────────
  private parseAIResponse(response: string, category: string): VisionAnalysisResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.fallbackParse(response, category);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        confidence: Math.min(Math.max(parsed.confidence || 50, 0), 100),
        isAuthentic: parsed.isAuthentic !== false,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        notes: parsed.notes || response.substring(0, 200),
        matchesQuest: parsed.matchesQuest !== false,
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        rawResponse: response,
      };
    } catch {
      return this.fallbackParse(response, category);
    }
  }

  // ─── FALLBACK PARSE ───────────────────────────────
  private fallbackParse(response: string, category: string): VisionAnalysisResult {
    const lower = response.toLowerCase();
    let confidence = 60;

    // Boost confidence for positive indicators
    if (lower.includes('match') || lower.includes('evidence') || lower.includes('complete')) {
      confidence += 15;
    }
    if (lower.includes('authentic') || lower.includes('real')) {
      confidence += 10;
    }

    // Lower confidence for negative indicators
    if (lower.includes('screenshot') || lower.includes('not match')) {
      confidence -= 20;
    }
    if (lower.includes('blurry') || lower.includes('unclear')) {
      confidence -= 10;
    }

    return {
      confidence: Math.min(Math.max(confidence, 0), 100),
      isAuthentic: !lower.includes('screenshot'),
      tags: [category, 'ai_analyzed'],
      notes: response.substring(0, 300),
      matchesQuest: confidence >= 50,
      flags: confidence < 50 ? ['low_confidence'] : [],
      rawResponse: response,
    };
  }

  // ─── MOCK IMAGE ANALYSIS ──────────────────────────
  private mockAnalysis(category: string): VisionAnalysisResult {
    const confidence = 75 + Math.floor(Math.random() * 20);
    const tags = this.getCategoryTags(category);

    return {
      confidence,
      isAuthentic: true,
      tags,
      notes: `[Mock] Photo submitted for ${category} quest. Detected: ${tags.join(', ')}`,
      matchesQuest: confidence >= 60,
      flags: [],
      rawResponse: 'mock_analysis',
    };
  }

  // ─── MOCK TEXT ANALYSIS ───────────────────────────
  private mockTextAnalysis(text: string, category: string): VisionAnalysisResult {
    const wordCount = text.split(/\s+/).length;
    let confidence = 50;

    if (wordCount > 30) confidence += 15;
    if (wordCount > 60) confidence += 10;
    if (text.length > 100) confidence += 5;

    const flags: string[] = [];
    if (wordCount < 10) flags.push('too_short');
    if (wordCount < 20) flags.push('vague');

    return {
      confidence: Math.min(confidence, 90),
      isAuthentic: true,
      tags: [category, 'text_evidence'],
      notes: `[Mock] Text evidence (${wordCount} words) for ${category} quest`,
      matchesQuest: confidence >= 50,
      flags,
      rawResponse: 'mock_analysis',
    };
  }

  // ─── CATEGORY TAGS ────────────────────────────────
  private getCategoryTags(category: string): string[] {
    const tags: Record<string, string[]> = {
      nature: ['outdoor', 'plants', 'nature', 'sky'],
      creativity: ['art', 'creative', 'drawing', 'writing'],
      kindness: ['social', 'kindness', 'helping'],
      learning: ['education', 'books', 'knowledge'],
      movement: ['exercise', 'fitness', 'outdoor'],
      social: ['people', 'conversation', 'social'],
      photography: ['photo', 'camera', 'composition'],
      relaxation: ['calm', 'peaceful', 'meditation'],
      adventure: ['exploration', 'new_place', 'discovery'],
    };
    return tags[category] || ['general'];
  }
}
