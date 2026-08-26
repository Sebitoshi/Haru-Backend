import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BotiMemoryDocument = HydratedDocument<BotiMemory>;

@Schema({ timestamps: true, collection: 'boti_memories' })
export class BotiMemory {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  type: string; // preference, event, conversation, milestone, context

  @Prop({ required: true })
  key: string; // favorite_category, last_quest_type, mood_pattern, etc.

  @Prop({ required: true, type: Object })
  value: Record<string, any>; // The actual memory data

  @Prop({ default: 0 })
  importance: number; // 0-10, higher = more important to remember

  @Prop()
  lastAccessedAt: Date;

  @Prop({ default: 0 })
  accessCount: number;

  @Prop()
  expiresAt: Date; // Optional TTL for temporary memories
}

export const BotiMemorySchema = SchemaFactory.createForClass(BotiMemory);

// Index for efficient queries
BotiMemorySchema.index({ userId: 1, type: 1 });
BotiMemorySchema.index({ userId: 1, key: 1 }, { unique: true });
BotiMemorySchema.index({ userId: 1, importance: -1 });
