import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BotiMemory,
  BotiMemoryDocument,
} from './schemas/boti-memory.schema';

@Injectable()
export class BotiMemoryService {
  private readonly logger = new Logger(BotiMemoryService.name);

  constructor(
    @InjectModel(BotiMemory.name)
    private memoryModel: Model<BotiMemoryDocument>,
  ) {}

  // ─── SAVE MEMORY ──────────────────────────────────
  async saveMemory(
    userId: string,
    type: string,
    key: string,
    value: any,
    importance: number = 5,
  ) {
    console.log(
      `[BotiMemoryService] SaveMemory: ${type}/${key} for ${userId}`,
    );

    try {
      const existing = await this.memoryModel.findOne({ userId, key });

      if (existing) {
        existing.value = value;
        existing.importance = Math.max(existing.importance, importance);
        existing.lastAccessedAt = new Date();
        existing.accessCount += 1;
        await existing.save();
        console.log(`[BotiMemoryService] Memory updated: ${key}`);
        return existing;
      }

      const memory = await this.memoryModel.create({
        userId,
        type,
        key,
        value,
        importance,
        lastAccessedAt: new Date(),
        accessCount: 1,
      });

      console.log(`[BotiMemoryService] Memory created: ${key}`);
      return memory;
    } catch (error) {
      this.logger.warn(
        `MongoDB unavailable, skipping save of memory ${type}/${key}: ${error?.message ?? error}`,
      );
      return null;
    }
  }

  // ─── GET MEMORY ───────────────────────────────────
  async getMemory(userId: string, key: string) {
    console.log(`[BotiMemoryService] GetMemory: ${key} for ${userId}`);

    try {
      const memory = await this.memoryModel.findOne({ userId, key });

      if (memory) {
        memory.lastAccessedAt = new Date();
        memory.accessCount += 1;
        await memory.save();
      }

      return memory;
    } catch (error) {
      this.logger.warn(
        `MongoDB unavailable, skipping get of memory ${key}: ${error?.message ?? error}`,
      );
      return null;
    }
  }

  // ─── GET MEMORIES BY TYPE ─────────────────────────
  async getMemoriesByType(userId: string, type: string, limit: number = 10) {
    console.log(
      `[BotiMemoryService] GetMemoriesByType: ${type} for ${userId}`,
    );

    try {
      return await this.memoryModel
        .find({ userId, type })
        .sort({ importance: -1, lastAccessedAt: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.warn(
        `MongoDB unavailable, returning empty memories for ${type}: ${error?.message ?? error}`,
      );
      return [];
    }
  }

  // ─── GET ALL MEMORIES ─────────────────────────────
  async getAllMemories(userId: string, limit: number = 50) {
    console.log(`[BotiMemoryService] GetAllMemories: ${userId}`);

    try {
      return await this.memoryModel
        .find({ userId })
        .sort({ importance: -1, lastAccessedAt: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.warn(
        `MongoDB unavailable, returning empty memories: ${error?.message ?? error}`,
      );
      return [];
    }
  }

  // ─── DELETE MEMORY ────────────────────────────────
  async deleteMemory(userId: string, key: string) {
    console.log(`[BotiMemoryService] DeleteMemory: ${key} for ${userId}`);

    try {
      await this.memoryModel.deleteOne({ userId, key });
    } catch (error) {
      this.logger.warn(
        `MongoDB unavailable, skipping delete of memory ${key}: ${error?.message ?? error}`,
      );
    }
  }

  // ─── GET CONTEXTUAL MEMORIES ──────────────────────
  async getContextualMemories(userId: string) {
    console.log(`[BotiMemoryService] GetContextualMemories: ${userId}`);

    try {
      // Get the most important and recent memories
      const memories = await this.memoryModel
        .find({ userId })
        .sort({ importance: -1 })
        .limit(20)
        .exec();

      // Group by type for easy access
      const grouped: Record<string, any[]> = {};
      for (const memory of memories) {
        if (!grouped[memory.type]) {
          grouped[memory.type] = [];
        }
        grouped[memory.type].push({
          key: memory.key,
          value: memory.value,
          importance: memory.importance,
        });
      }

      return grouped;
    } catch (error) {
      this.logger.warn(
        `MongoDB unavailable, returning no context: ${error?.message ?? error}`,
      );
      return {};
    }
  }

  // ─── GENERATE MEMORY REFERENCE ────────────────────
  async generateMemoryReference(userId: string): Promise<string | null> {
    console.log(`[BotiMemoryService] GenerateMemoryReference: ${userId}`);

    let memories: BotiMemoryDocument[] = [];
    try {
      memories = await this.memoryModel
        .find({ userId, importance: { $gte: 5 } })
        .sort({ lastAccessedAt: -1 })
        .limit(5)
        .exec();
    } catch (error) {
      this.logger.warn(
        `MongoDB unavailable, skipping memory reference: ${error?.message ?? error}`,
      );
      return null;
    }

    if (memories.length === 0) return null;

    // Pick a random important memory to reference
    const randomIndex = Math.floor(Math.random() * memories.length);
    const memory = memories[randomIndex];

    // Generate a contextual reference based on memory type
    const references: Record<string, string[]> = {
      preference: [
        'Recuerdo que te gustan las actividades {value}',
        'Últimamente has disfrutado mucho las {value}',
        'No olvido que prefieres las {value}',
      ],
      event: [
        'La última vez que hablamos, {value}',
        'Recuerdo que {value}',
        'Antes mencionaste que {value}',
      ],
      milestone: [
        '¡No olvido cuando {value}!',
        'Fue genial cuando {value}',
        'Ese día especial en que {value}',
      ],
    };

    const templates = references[memory.type] || references.event;
    const template = templates[Math.floor(Math.random() * templates.length)];

    const valueStr =
      typeof memory.value === 'string'
        ? memory.value
        : JSON.stringify(memory.value);

    return template.replace('{value}', valueStr);
  }
}