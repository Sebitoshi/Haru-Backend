import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquipSlot } from '@prisma/client';

// ═══════════════════════════════════════════════════════════
// DEFAULT BOTI APPEARANCE
// ═══════════════════════════════════════════════════════════

const DEFAULT_BOTI = {
  bodyType: 'standard',
  bodyColor: '#4FC3F7',
  eyeStyle: 'round',
  mouthStyle: 'smile',
  expression: 'calm',
  accessories: null,
  effect: null,
  theme: null,
  title: null,
  frame: null,
};

// ═══════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════

const BOTI_PRESETS = [
  {
    id: 'default',
    name: '🌸 Haru Default',
    description: 'El look clásico de Boti.',
    items: { bodyType: 'standard', bodyColor: '#4FC3F7', eyeStyle: 'round', mouthStyle: 'smile' },
  },
  {
    id: 'cute',
    name: ' adorable Boti',
    description: 'Boti adorable y tierno.',
    items: { bodyType: 'mini', bodyColor: '#FFB7C5', eyeStyle: 'round', mouthStyle: 'happy' },
  },
  {
    id: 'cool',
    name: '😎 Boti Cool',
    description: 'Boti con estilo.',
    items: { bodyType: 'tall', bodyColor: '#1A1A2E', eyeStyle: 'stars', mouthStyle: 'cool' },
  },
  {
    id: 'nature',
    name: '🌿 Boti Naturaleza',
    description: 'Boti inspirado en la naturaleza.',
    items: { bodyType: 'standard', bodyColor: '#2D6A4F', eyeStyle: 'round', mouthStyle: 'smile' },
  },
  {
    id: 'galaxy',
    name: '🌌 Boti Galaxia',
    description: 'Boti cósmico y misterioso.',
    items: { bodyType: 'tall', bodyColor: '#7B2D8E', eyeStyle: 'stars', mouthStyle: 'excited' },
  },
];

@Injectable()
export class CustomizationService {
  private readonly logger = new Logger(CustomizationService.name);

  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════
  // GET BOTI APPEARANCE (full loadout)
  // ═══════════════════════════════════════════════════

  async getBotiAppearance(userId: string): Promise<{
    boti: Record<string, any>;
    equipped: any[];
    isDefault: boolean;
  }> {
    const equipped = await this.prisma.userEquipped.findMany({
      where: { userId },
      orderBy: { slot: 'asc' },
    });

    // Build appearance from equipped items
    const appearance = { ...DEFAULT_BOTI };
    for (const e of equipped) {
      this.applyEquippedToAppearance(appearance, e.slot, e.itemId);
    }

    const isDefault = equipped.length === 0;

    return {
      boti: appearance,
      equipped: equipped.map((e) => ({
        slot: e.slot,
        itemId: e.itemId,
        itemName: e.itemName,
        itemImage: e.itemImage,
      })),
      isDefault,
    };
  }

  // ═══════════════════════════════════════════════════
  // PREVIEW — Try items before equipping
  // ═══════════════════════════════════════════════════

  async previewCombination(
    userId: string,
    items: { slot: string; itemId: string }[],
  ): Promise<{ preview: Record<string, any>; items: any[] }> {
    // Get current appearance
    const { boti: currentAppearance } = await this.getBotiAppearance(userId);

    // Apply preview items on top
    const preview = { ...currentAppearance };
    for (const item of items) {
      this.applyEquippedToAppearance(preview, item.slot, item.itemId);
    }

    return {
      preview,
      items: items.map((i) => ({ slot: i.slot, itemId: i.itemId })),
    };
  }

  // ═══════════════════════════════════════════════════
  // PRESETS
  // ═══════════════════════════════════════════════════

  async getPresets(): Promise<{ presets: any[] }> {
    return {
      presets: BOTI_PRESETS.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        items: p.items,
      })),
    };
  }

  async applyPreset(userId: string, presetId: string): Promise<{ applied: boolean; preset: string; boti: Record<string, any> }> {
    const preset = BOTI_PRESETS.find((p) => p.id === presetId);
    if (!preset) {
      throw new BadRequestException(`Preset not found: ${presetId}`);
    }

    this.logger.log(`ApplyPreset: userId=${userId}, preset=${presetId}`);

    // Clear all current equipped items
    await this.prisma.userEquipped.deleteMany({ where: { userId } });

    // Mark all purchases as unequipped
    await this.prisma.userShopPurchase.updateMany({
      where: { userId },
      data: { equipped: false },
    });

    // The preset items are applied as defaults (not from shop)
    // They reset Boti to a base appearance
    const appearance = { ...DEFAULT_BOTI, ...preset.items };

    this.logger.log(`ApplyPreset OK: userId=${userId}, preset=${presetId}`);

    return {
      applied: true,
      preset: presetId,
      boti: appearance,
    };
  }

  // ═══════════════════════════════════════════════════
  // RESET TO DEFAULT
  // ═══════════════════════════════════════════════════

  async resetToDefault(userId: string): Promise<{ reset: boolean; boti: Record<string, any> }> {
    this.logger.log(`ResetToDefault: userId=${userId}`);

    // Clear all equipped items
    await this.prisma.userEquipped.deleteMany({ where: { userId } });

    // Mark all purchases as unequipped
    await this.prisma.userShopPurchase.updateMany({
      where: { userId },
      data: { equipped: false },
    });

    return {
      reset: true,
      boti: { ...DEFAULT_BOTI },
    };
  }

  // ═══════════════════════════════════════════════════
  // SAVE PRESET (user custom)
  // ═══════════════════════════════════════════════════

  async saveAsPreset(
    userId: string,
    name: string,
  ): Promise<{ saved: boolean; presetName: string; items: any[] }> {
    const equipped = await this.prisma.userEquipped.findMany({
      where: { userId },
    });

    if (equipped.length === 0) {
      throw new BadRequestException('No items equipped to save as preset');
    }

    // Store in activity log as a custom preset
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'customization_preset_saved',
        details: {
          name,
          items: equipped.map((e) => ({
            slot: e.slot,
            itemId: e.itemId,
            itemName: e.itemName,
          })),
          savedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`SavePreset: userId=${userId}, name="${name}", items=${equipped.length}`);

    return {
      saved: true,
      presetName: name,
      items: equipped.map((e) => ({
        slot: e.slot,
        itemId: e.itemId,
        itemName: e.itemName,
      })),
    };
  }

  // ═══════════════════════════════════════════════════
  // GET USER CUSTOM PRESETS
  // ═══════════════════════════════════════════════════

  async getUserPresets(userId: string): Promise<{ presets: any[] }> {
    const logs = await this.prisma.activityLog.findMany({
      where: { userId, action: 'customization_preset_saved' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const presets = logs.map((log) => {
      const details = log.details as any;
      return {
        name: details?.name || 'Unnamed',
        items: details?.items || [],
        savedAt: log.createdAt,
      };
    });

    return { presets };
  }

  // ═══════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════

  private applyEquippedToAppearance(appearance: Record<string, any>, slot: string, itemId: string): void {
    switch (slot) {
      case 'body':
        appearance.bodyType = itemId.replace('body_', '');
        break;
      case 'color':
        appearance.bodyColor = this.getColorFromCode(itemId);
        break;
      case 'eyes':
        appearance.eyeStyle = itemId.replace('eyes_', '');
        break;
      case 'expression':
        appearance.mouthStyle = itemId.replace('expr_', '');
        break;
      case 'head':
        appearance.headAccessory = itemId.replace('head_', '');
        break;
      case 'accessories':
        appearance.accessories = itemId.replace('acc_', '');
        break;
      case 'effect':
        appearance.effect = itemId.replace('effect_', '');
        break;
      case 'theme':
        appearance.theme = itemId.replace('theme_', '');
        break;
      case 'title':
        appearance.title = itemId.replace('title_', '');
        break;
      case 'frame':
        appearance.frame = itemId.replace('frame_', '');
        break;
    }
  }

  private getColorFromCode(code: string): string {
    const colorMap: Record<string, string> = {
      color_sakura: '#FFB7C5',
      color_ocean: '#0077B6',
      color_forest: '#2D6A4F',
      color_sunset: '#FF6B35',
      color_galaxy: '#7B2D8E',
      color_golden: '#FFD700',
      color_rainbow: 'rainbow',
    };
    return colorMap[code] || '#4FC3F7';
  }
}
