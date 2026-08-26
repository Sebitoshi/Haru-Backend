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

@Injectable()
export class GroqVisionService {
  private readonly logger = new Logger(GroqVisionService.name);
  private groq: Groq | null = null;
  private readonly model = 'qwen/qwen3.6-27b';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('GROQ_API_KEY');
    if (apiKey && apiKey !== 'gsk_your_groq_api_key_here') {
      this.groq = new Groq({ apiKey });
      this.logger.log('Groq Vision API initialized (qwen/qwen3.6-27b)');
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
        model: this.model,
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
        model: this.model,
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
        model: this.model,
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
