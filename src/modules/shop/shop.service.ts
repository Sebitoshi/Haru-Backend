import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { ShopItemCategory, ShopItemRarity } from '../../generated/prisma/client';

// ═══════════════════════════════════════════════════════════
// EXTENDED SHOP CATALOG — Visual items for Boti customization
// ═══════════════════════════════════════════════════════════

interface VisualShopItem {
  code: string;
  name: string;
  description: string;
  category: ShopItemCategory;
  slot: string; // EquipSlot
  rarity: ShopItemRarity;
  price: number;
  imageUrl?: string;
  preview?: Record<string, any>; // preview data for frontend
  isNew?: boolean;
  isFeatured?: boolean;
  isLimited?: boolean;
}

const VISUAL_CATALOG: VisualShopItem[] = [
  // ─── 👕 BODY TYPES ─────────────────────────────
  { code: 'body_round', name: 'Boti Redondo', description: 'Forma redonda y amigable.', category: 'cosmetic', slot: 'body', rarity: 'common', price: 100, preview: { bodyType: 'round' } },
  { code: 'body_square', name: 'Boti Cuadrado', description: 'Forma cuadrada y moderna.', category: 'cosmetic', slot: 'body', rarity: 'common', price: 100, preview: { bodyType: 'square' } },
  { code: 'body_tall', name: 'Boti Alta', description: 'Forma alargada y elegante.', category: 'cosmetic', slot: 'body', rarity: 'uncommon', price: 200, preview: { bodyType: 'tall' } },
  { code: 'body_mini', name: 'Boti Mini', description: 'Forma pequeña y adorable.', category: 'cosmetic', slot: 'body', rarity: 'rare', price: 350, preview: { bodyType: 'mini' }, isNew: true },

  // ─── 🎨 COLORS ────────────────────────────────
  { code: 'color_sakura', name: 'Sakura Pink', description: 'Rosa suave de cerezo.', category: 'cosmetic', slot: 'color', rarity: 'common', price: 50, preview: { bodyColor: '#FFB7C5' } },
  { code: 'color_ocean', name: 'Océano Blue', description: 'Azul profundo del mar.', category: 'cosmetic', slot: 'color', rarity: 'common', price: 50, preview: { bodyColor: '#0077B6' } },
  { code: 'color_forest', name: 'Forest Green', description: 'Verde bosque natural.', category: 'cosmetic', slot: 'color', rarity: 'common', price: 50, preview: { bodyColor: '#2D6A4F' } },
  { code: 'color_sunset', name: 'Sunset Orange', description: 'Naranja cálido de atardecer.', category: 'cosmetic', slot: 'color', rarity: 'uncommon', price: 100, preview: { bodyColor: '#FF6B35' } },
  { code: 'color_galaxy', name: 'Galaxy Purple', description: 'Púrpura cósmico brillante.', category: 'cosmetic', slot: 'color', rarity: 'rare', price: 200, preview: { bodyColor: '#7B2D8E' } },
  { code: 'color_golden', name: 'Golden Boti', description: 'Dorado reluciente y premium.', category: 'cosmetic', slot: 'color', rarity: 'epic', price: 500, preview: { bodyColor: '#FFD700' }, isFeatured: true },
  { code: 'color_rainbow', name: 'Rainbow Boti', description: 'Arcoíris animado y divertido.', category: 'cosmetic', slot: 'color', rarity: 'legendary', price: 1000, preview: { bodyColor: 'rainbow' }, isNew: true },

  // ─── 👓 EYES ──────────────────────────────────
  { code: 'eyes_round', name: 'Ojos Redondos', description: 'Ojos grandes y expresivos.', category: 'cosmetic', slot: 'eyes', rarity: 'common', price: 75, preview: { eyeStyle: 'round' } },
  { code: 'eyes_sleepy', name: 'Ojos Dormilones', description: 'Ojos relajados y chill.', category: 'cosmetic', slot: 'eyes', rarity: 'uncommon', price: 150, preview: { eyeStyle: 'sleepy' } },
  { code: 'eyes_stars', name: 'Ojos de Estrella', description: 'Ojos con forma de estrella.', category: 'cosmetic', slot: 'eyes', rarity: 'rare', price: 300, preview: { eyeStyle: 'stars' } },
  { code: 'eyes_heart', name: 'Ojos de Corazón', description: 'Ojos en forma de corazón.', category: 'cosmetic', slot: 'eyes', rarity: 'epic', price: 400, preview: { eyeStyle: 'heart' } },

  // ─── 😊 EXPRESSIONS ──────────────────────────
  { code: 'expr_happy', name: 'Feliz', description: 'Sonrisa amplia y alegre.', category: 'cosmetic', slot: 'expression', rarity: 'common', price: 50, preview: { mouthStyle: 'happy' } },
  { code: 'expr_wink', name: 'Guiño', description: 'Un ojo cerrado, muy cool.', category: 'cosmetic', slot: 'expression', rarity: 'uncommon', price: 100, preview: { mouthStyle: 'wink' } },
  { code: 'expr_excited', name: 'Emocionado', description: 'Boca abierta de sorpresa.', category: 'cosmetic', slot: 'expression', rarity: 'uncommon', price: 120, preview: { mouthStyle: 'excited' } },
  { code: 'expr_cool', name: 'Cool', description: 'Sonrisa confiada con lentes.', category: 'cosmetic', slot: 'expression', rarity: 'rare', price: 250, preview: { mouthStyle: 'cool' } },
  { code: 'expr_party', name: 'Fiesta', description: 'Expresión de celebración.', category: 'cosmetic', slot: 'expression', rarity: 'epic', price: 400, preview: { mouthStyle: 'party' }, isFeatured: true },

  // ─── 🧢 HEAD ACCESSORIES ──────────────────────
  { code: 'head_cap', name: 'Gorra', description: 'Gorra deportiva casual.', category: 'cosmetic', slot: 'head', rarity: 'common', price: 100, preview: { accessory: 'cap' } },
  { code: 'head_crown', name: 'Corona', description: 'Corona dorada de rey/reina.', category: 'cosmetic', slot: 'head', rarity: 'epic', price: 600, preview: { accessory: 'crown' }, isFeatured: true },
  { code: 'head_flower', name: 'Flor', description: 'Flor fresca en la cabeza.', category: 'cosmetic', slot: 'head', rarity: 'uncommon', price: 150, preview: { accessory: 'flower' } },
  { code: 'head_antenna', name: 'Antena', description: 'Antena de robot divertida.', category: 'cosmetic', slot: 'head', rarity: 'rare', price: 300, preview: { accessory: 'antenna' }, isNew: true },

  // ─── 👓 ACCESSORIES ──────────────────────────
  { code: 'acc_glasses', name: 'Lentes', description: 'Lentes intelectuales.', category: 'cosmetic', slot: 'accessories', rarity: 'common', price: 100, preview: { accessory: 'glasses' } },
  { code: 'acc_scarf', name: 'Bufanda', description: 'Bufanda cálida de invierno.', category: 'cosmetic', slot: 'accessories', rarity: 'uncommon', price: 200, preview: { accessory: 'scarf' } },
  { code: 'acc_wings', name: 'Alitas', description: 'Alitas angelicales brillantes.', category: 'cosmetic', slot: 'accessories', rarity: 'legendary', price: 1500, preview: { accessory: 'wings' }, isNew: true },

  // ─── ✨ EFFECTS ──────────────────────────────
  { code: 'effect_sparkle', name: 'Destellos', description: 'Partículas brillantes alrededor.', category: 'cosmetic', slot: 'effect', rarity: 'uncommon', price: 200, preview: { effect: 'sparkle' } },
  { code: 'effect_fire', name: 'Fuego', description: 'Llamas pequeñas alrededor de Boti.', category: 'cosmetic', slot: 'effect', rarity: 'rare', price: 400, preview: { effect: 'fire' } },
  { code: 'effect_rain', name: 'Lluvia', description: 'Gotas de lluvia suaves.', category: 'cosmetic', slot: 'effect', rarity: 'uncommon', price: 180, preview: { effect: 'rain' } },
  { code: 'effect_petals', name: 'Pétalos', description: 'Pétalos de cerezo flotando.', category: 'cosmetic', slot: 'effect', rarity: 'rare', price: 350, preview: { effect: 'petals' }, isFeatured: true },

  // ─── 🏠 THEMES (Profile) ────────────────────
  { code: 'theme_sunset', name: 'Atardecer', description: 'Tonos naranjas y dorados.', category: 'decoration', slot: 'theme', rarity: 'uncommon', price: 200, preview: { theme: 'sunset' } },
  { code: 'theme_ocean', name: 'Océano', description: 'Tonos azules y turquesa.', category: 'decoration', slot: 'theme', rarity: 'uncommon', price: 200, preview: { theme: 'ocean' } },
  { code: 'theme_forest', name: 'Bosque', description: 'Verdes y marrones tierra.', category: 'decoration', slot: 'theme', rarity: 'uncommon', price: 200, preview: { theme: 'forest' } },
  { code: 'theme_galaxy', name: 'Galaxia', description: 'Oscuro con estrellas y nebulosas.', category: 'decoration', slot: 'theme', rarity: 'rare', price: 400, preview: { theme: 'galaxy' } },
  { code: 'theme_sakura', name: 'Sakura', description: 'Japonés con flores de cerezo.', category: 'decoration', slot: 'theme', rarity: 'rare', price: 400, preview: { theme: 'sakura' } },

  // ─── 🖼️ FRAMES ──────────────────────────────
  { code: 'frame_golden', name: 'Marco Dorado', description: 'Marco brillante dorado.', category: 'decoration', slot: 'frame', rarity: 'rare', price: 500, preview: { frame: 'golden' } },
  { code: 'frame_floral', name: 'Marco Floral', description: 'Marco con flores.', category: 'decoration', slot: 'frame', rarity: 'uncommon', price: 300, preview: { frame: 'floral' } },
  { code: 'frame_neon', name: 'Marco Neón', description: 'Marco brillante de neón.', category: 'decoration', slot: 'frame', rarity: 'epic', price: 700, preview: { frame: 'neon' }, isNew: true },

  // ─── 🏷️ TITLES ──────────────────────────────
  { code: 'title_explorer', name: 'Título: Explorador', description: '"🗺️ Explorador" en perfil.', category: 'decoration', slot: 'title', rarity: 'uncommon', price: 150, preview: { title: '🗺️ Explorador' } },
  { code: 'title_legend', name: 'Título: Leyenda', description: '"👑 Leyenda de Haru" en perfil.', category: 'decoration', slot: 'title', rarity: 'epic', price: 1000, preview: { title: '👑 Leyenda de Haru' } },
  { code: 'title_pioneer', name: 'Título: Pionero', description: '"🌱 Pionero de Haru" — solo primeros 100 usuarios.', category: 'decoration', slot: 'title', rarity: 'legendary', price: 2000, preview: { title: '🌱 Pionero de Haru' }, isLimited: true },
];

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    private prisma: PrismaService,
    private economyService: EconomyService,
  ) {}

  // ═══════════════════════════════════════════════════
  // CATALOG — Full visual catalog
  // ═══════════════════════════════════════════════════

  async getCatalog(
    userId: string,
    options: {
      category?: ShopItemCategory;
      slot?: string;
      rarity?: ShopItemRarity;
      search?: string;
      sort?: 'price_asc' | 'price_desc' | 'newest' | 'rarity';
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    items: any[];
    featured: any[];
    newArrivals: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    userCoins: number;
  }> {
    const { category, slot, rarity, search, sort = 'newest', page = 1, limit = 20 } = options;

    // Get user's owned items (UserShopPurchase.itemId es el id de ShopItem,
    // así que resolvemos a code para comparar con el catálogo visual).
    const purchases = await this.prisma.userShopPurchase.findMany({
      where: { userId },
      select: { quantity: true, item: { select: { code: true } } },
    });
    const ownedMap: Record<string, number> = {};
    for (const p of purchases) {
      const code = p.item.code;
      ownedMap[code] = (ownedMap[code] || 0) + p.quantity;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalCoins: true },
    });

    let items = [...VISUAL_CATALOG];

    // Filters
    if (category) items = items.filter((i) => i.category === category);
    if (slot) items = items.filter((i) => i.slot === slot);
    if (rarity) items = items.filter((i) => i.rarity === rarity);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
      );
    }

    // Sort
    switch (sort) {
      case 'price_asc': items.sort((a, b) => a.price - b.price); break;
      case 'price_desc': items.sort((a, b) => b.price - a.price); break;
      case 'rarity': {
        const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
        items.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
        break;
      }
      default: // newest — new items first
        items.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    }

    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit);

    // Map to response
    const mapped = paginated.map((item) => ({
      code: item.code,
      name: item.name,
      description: item.description,
      category: item.category,
      slot: item.slot,
      rarity: item.rarity,
      price: item.price,
      imageUrl: item.imageUrl,
      preview: item.preview,
      isNew: item.isNew || false,
      isFeatured: item.isFeatured || false,
      owned: ownedMap[item.code] || 0,
      canAfford: (user?.totalCoins || 0) >= item.price,
    }));

    // Featured items
    const featured = VISUAL_CATALOG
      .filter((i) => i.isFeatured)
      .map((item) => ({
        code: item.code,
        name: item.name,
        slot: item.slot,
        rarity: item.rarity,
        price: item.price,
        preview: item.preview,
      }));

    // New arrivals
    const newArrivals = VISUAL_CATALOG
      .filter((i) => i.isNew)
      .map((item) => ({
        code: item.code,
        name: item.name,
        slot: item.slot,
        rarity: item.rarity,
        price: item.price,
        preview: item.preview,
      }));

    return {
      items: mapped,
      featured,
      newArrivals,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      userCoins: user?.totalCoins || 0,
    };
  }

  // ═══════════════════════════════════════════════════
  // ITEM DETAIL
  // ═══════════════════════════════════════════════════

  async getItemDetail(userId: string, itemCode: string): Promise<any> {
    const item = VISUAL_CATALOG.find((i) => i.code === itemCode);
    if (!item) throw new NotFoundException(`Item not found: ${itemCode}`);

    const owned = await this.prisma.userShopPurchase.aggregate({
      where: { userId, item: { code: itemCode } },
      _sum: { quantity: true },
    });

    const equipped = await this.prisma.userEquipped.findFirst({
      where: { userId, itemId: itemCode },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalCoins: true },
    });

    // Get all items in same slot for comparison
    const sameSlot = VISUAL_CATALOG
      .filter((i) => i.slot === item.slot && i.code !== itemCode)
      .map((i) => ({ code: i.code, name: i.name, rarity: i.rarity, price: i.price }));

    return {
      code: item.code,
      name: item.name,
      description: item.description,
      category: item.category,
      slot: item.slot,
      rarity: item.rarity,
      price: item.price,
      imageUrl: item.imageUrl,
      preview: item.preview,
      isNew: item.isNew || false,
      isFeatured: item.isFeatured || false,
      owned: owned._sum.quantity || 0,
      isEquipped: !!equipped,
      canAfford: (user?.totalCoins || 0) >= item.price,
      sameSlot,
    };
  }

  // ═══════════════════════════════════════════════════
  // BUY (delegates to EconomyService)
  // ═══════════════════════════════════════════════════

  async buyItem(userId: string, itemCode: string, quantity: number = 1) {
    const item = VISUAL_CATALOG.find((i) => i.code === itemCode);
    if (!item) throw new NotFoundException(`Item not found: ${itemCode}`);

    return this.economyService.buyItem(userId, itemCode, quantity);
  }

  // ═══════════════════════════════════════════════════
  // CATEGORIES — Available categories with counts
  // ═══════════════════════════════════════════════════

  async getCategories(): Promise<{ categories: any[]; slots: any[] }> {
    const categories = Object.values(ShopItemCategory).map((cat) => ({
      id: cat,
      name: this.getCategoryName(cat),
      emoji: this.getCategoryEmoji(cat),
      itemCount: VISUAL_CATALOG.filter((i) => i.category === cat).length,
    }));

    const slotNames: Record<string, string> = {
      body: 'Cuerpo', color: 'Color', clothing: 'Ropa', head: 'Cabeza',
      eyes: 'Ojos', accessories: 'Accesorios', expression: 'Expresiones',
      effect: 'Efectos', theme: 'Temas', title: 'Títulos', frame: 'Marcos',
    };

    const slots = Object.keys(slotNames).map((slot) => ({
      id: slot,
      name: slotNames[slot],
      itemCount: VISUAL_CATALOG.filter((i) => i.slot === slot).length,
    }));

    return { categories, slots };
  }

  // ═══════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════

  private getCategoryName(cat: ShopItemCategory): string {
    const names: Record<string, string> = {
      protection: 'Protección', cosmetic: 'Cosméticos',
      decoration: 'Decoración', special: 'Especiales',
    };
    return names[cat] || cat;
  }

  private getCategoryEmoji(cat: ShopItemCategory): string {
    const emojis: Record<string, string> = {
      protection: '🛡️', cosmetic: '👕', decoration: '🏠', special: '⭐',
    };
    return emojis[cat] || '📦';
  }
}
