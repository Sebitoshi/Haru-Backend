import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquipSlot } from '../../generated/prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════
  // GET USER INVENTORY
  // ═══════════════════════════════════════════════════

  async getInventory(
    userId: string,
    options: {
      category?: string;
      slot?: string;
      equipped?: boolean;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    items: any[];
    equipped: any[];
    stats: { totalItems: number; equippedCount: number; bySlot: Record<string, number> };
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { category, slot, equipped, page = 1, limit = 50 } = options;

    // Get all purchases
    const where: any = { userId };
    const purchases = await this.prisma.userShopPurchase.findMany({
      where,
      include: {
        item: {
          select: {
            code: true, name: true, description: true,
            category: true, rarity: true, imageUrl: true, effect: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get equipped items
    const equippedItems = await this.prisma.userEquipped.findMany({
      where: { userId },
      orderBy: { slot: 'asc' },
    });

    const equippedMap: Record<string, any> = {};
    for (const e of equippedItems) {
      equippedMap[e.itemId] = e;
    }

    // Filter to unique items (group by item code)
    const uniqueItems = new Map<string, any>();
    for (const p of purchases) {
      const code = p.item.code;
      if (!uniqueItems.has(code)) {
        uniqueItems.set(code, {
          code,
          name: p.item.name,
          description: p.item.description,
          category: p.item.category,
          rarity: p.item.rarity,
          imageUrl: p.item.imageUrl,
          effect: p.item.effect,
          quantity: p.quantity,
          isEquipped: !!equippedMap[code],
          equippedSlot: equippedMap[code]?.slot || null,
          purchasedAt: p.createdAt,
        });
      } else {
        const existing = uniqueItems.get(code)!;
        existing.quantity += p.quantity;
      }
    }

    let items = Array.from(uniqueItems.values());

    // Filters
    if (category) items = items.filter((i) => i.category === category);
    if (slot) items = items.filter((i) => {
      const effect = i.effect;
      return effect?.type === slot || effect?.key === slot;
    });
    if (equipped !== undefined) {
      items = items.filter((i) => equipped ? i.isEquipped : !i.isEquipped);
    }

    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit);

    // Stats
    const allItems = Array.from(uniqueItems.values());
    const bySlot: Record<string, number> = {};
    for (const item of allItems) {
      const effect = item.effect;
      const s = effect?.type || effect?.key || 'other';
      bySlot[s] = (bySlot[s] || 0) + 1;
    }

    return {
      items: paginated,
      equipped: equippedItems.map((e) => ({
        slot: e.slot,
        itemId: e.itemId,
        itemName: e.itemName,
        itemImage: e.itemImage,
        equippedAt: e.equippedAt,
      })),
      stats: {
        totalItems: allItems.length,
        equippedCount: equippedItems.length,
        bySlot,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ═══════════════════════════════════════════════════
  // EQUIP ITEM
  // ═══════════════════════════════════════════════════

  async equipItem(userId: string, itemCode: string): Promise<{ equipped: boolean; slot: string; item: any }> {
    this.logger.log(`EquipItem: userId=${userId}, item=${itemCode}`);

    // 1. Check user owns this item
    const purchase = await this.prisma.userShopPurchase.findFirst({
      where: { userId, itemId: itemCode },
      include: { item: { select: { code: true, name: true, imageUrl: true, effect: true } } },
    });

    if (!purchase) {
      throw new BadRequestException(`You don't own item: ${itemCode}`);
    }

    // 2. Determine slot from effect
    const effect = purchase.item.effect;
    const slot = this.getSlotFromEffect(effect);
    if (!slot) {
      throw new BadRequestException(`Item ${itemCode} is not equippable`);
    }

    // 3. Unequip current item in that slot (if any)
    await this.prisma.userEquipped.deleteMany({
      where: { userId, slot: slot as EquipSlot },
    });

    // 4. Equip new item
    const equipped = await this.prisma.userEquipped.upsert({
      where: { userId_slot: { userId, slot: slot as EquipSlot } },
      update: {
        itemId: itemCode,
        itemName: purchase.item.name,
        itemImage: purchase.item.imageUrl,
        equippedAt: new Date(),
      },
      create: {
        userId,
        slot: slot as EquipSlot,
        itemId: itemCode,
        itemName: purchase.item.name,
        itemImage: purchase.item.imageUrl,
      },
    });

    // 5. Mark as equipped in purchase
    await this.prisma.userShopPurchase.updateMany({
      where: { userId, itemId: itemCode },
      data: { equipped: true },
    });

    // 6. Unequip previous item's purchase record
    const previousEquipped = await this.prisma.userShopPurchase.findFirst({
      where: { userId, itemId: { not: itemCode }, equipped: true },
    });
    if (previousEquipped) {
      // Only unequip items in the same slot
      const prevEffect = (previousEquipped as any).item?.effect;
      const prevSlot = prevEffect?.type || prevEffect?.key;
      if (prevSlot === slot) {
        await this.prisma.userShopPurchase.update({
          where: { id: previousEquipped.id },
          data: { equipped: false },
        });
      }
    }

    this.logger.log(`EquipItem OK: userId=${userId}, ${itemCode} → slot=${slot}`);

    return {
      equipped: true,
      slot,
      item: {
        code: itemCode,
        name: purchase.item.name,
        imageUrl: purchase.item.imageUrl,
      },
    };
  }

  // ═══════════════════════════════════════════════════
  // UNEQUIP ITEM
  // ═══════════════════════════════════════════════════

  async unequipSlot(userId: string, slot: string): Promise<{ unequipped: boolean; slot: string }> {
    this.logger.log(`UnequipSlot: userId=${userId}, slot=${slot}`);

    const existing = await this.prisma.userEquipped.findUnique({
      where: { userId_slot: { userId, slot: slot as EquipSlot } },
    });

    if (!existing) {
      throw new BadRequestException(`No item equipped in slot: ${slot}`);
    }

    // Mark purchase as unequipped
    await this.prisma.userShopPurchase.updateMany({
      where: { userId, itemId: existing.itemId },
      data: { equipped: false },
    });

    // Remove equipped record
    await this.prisma.userEquipped.delete({
      where: { userId_slot: { userId, slot: slot as EquipSlot } },
    });

    this.logger.log(`UnequipSlot OK: userId=${userId}, slot=${slot}`);

    return { unequipped: true, slot };
  }

  // ═══════════════════════════════════════════════════
  // GET EQUIPPED LOADOUT
  // ═══════════════════════════════════════════════════

  async getEquipped(userId: string): Promise<{ slots: any[]; botiPreview: Record<string, any> }> {
    const equipped = await this.prisma.userEquipped.findMany({
      where: { userId },
      orderBy: { slot: 'asc' },
    });

    const botiPreview: Record<string, any> = {};

    const slots = equipped.map((e) => {
      // Build preview data
      const effect = this.getPreviewFromSlot(e.slot, e.itemId);
      if (effect) Object.assign(botiPreview, effect);

      return {
        slot: e.slot,
        itemId: e.itemId,
        itemName: e.itemName,
        itemImage: e.itemImage,
        equippedAt: e.equippedAt,
      };
    });

    return { slots, botiPreview };
  }

  // ═══════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════

  private getSlotFromEffect(effect: any): string | null {
    if (!effect) return null;
    if (effect.type === 'boti_expression') return 'expression';
    if (effect.type === 'theme') return 'theme';
    if (effect.type === 'avatar_frame') return 'frame';
    if (effect.type === 'profile_title') return 'title';
    if (effect.type === 'cosmetic') return effect.key || null;
    if (effect.type === 'streak_protection') return null; // not equippable
    if (effect.type === 'xp_boost' || effect.type === 'coins_boost') return null;
    // For visual items, use the slot from the catalog
    return effect.slot || effect.type || null;
  }

  private getPreviewFromSlot(slot: string, itemId: string): Record<string, any> | null {
    // Map equipped slot to boti preview data
    const previewMap: Record<string, Record<string, any>> = {
      body: { bodyType: itemId.replace('body_', '') },
      color: { bodyColor: itemId.replace('color_', '') },
      eyes: { eyeStyle: itemId.replace('eyes_', '') },
      expression: { mouthStyle: itemId.replace('expr_', '') },
    };
    return previewMap[slot] || null;
  }
}
