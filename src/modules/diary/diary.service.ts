import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateDiaryDto {
  questId?: string;
  userQuestId?: string;
  title: string;
  description?: string;
  photoUrl?: string;
  location?: { lat: number; lng: number; name?: string };
  mood?: 'amazing' | 'happy' | 'calm' | 'tired' | 'reflective';
  category?: string;
  xpEarned?: number;
  coinsEarned?: number;
  tags?: string[];
}

export interface UpdateDiaryDto {
  title?: string;
  description?: string;
  mood?: 'amazing' | 'happy' | 'calm' | 'tired' | 'reflective';
  isFavorite?: boolean;
  isHidden?: boolean;
  tags?: string[];
}

export interface DiaryFilters {
  category?: string;
  mood?: string;
  isFavorite?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name);

  constructor(private prisma: PrismaService) {}

  // ─── CREATE ENTRY ──────────────────────────────────
  async createEntry(userId: string, dto: CreateDiaryDto) {
    this.logger.log(`CreateEntry: userId=${userId}, title="${dto.title}", category=${dto.category}`);

    const entry = await this.prisma.diaryEntry.create({
      data: {
        userId,
        questId: dto.questId || null,
        userQuestId: dto.userQuestId || null,
        title: dto.title,
        description: dto.description || null,
        photoUrl: dto.photoUrl || null,
        location: dto.location || undefined,
        mood: dto.mood || undefined,
        category: dto.category || undefined,
        xpEarned: dto.xpEarned || 0,
        coinsEarned: dto.coinsEarned || 0,
        tags: dto.tags || [],
      },
    });

    this.logger.log(`CreateEntry: OK — id=${entry.id}`);
    return entry;
  }

  // ─── AUTO-CREATE FROM VERIFIED QUEST ───────────────
  async createFromQuestCompletion(
    userId: string,
    questId: string,
    userQuestId: string,
    data: {
      questTitle: string;
      category: string;
      photoUrl?: string;
      location?: any;
      xpEarned: number;
      coinsEarned: number;
    },
  ) {
    this.logger.log(`createFromQuestCompletion: quest="${data.questTitle}" for ${userId}`);

    // Check if diary entry already exists for this userQuest
    const existing = await this.prisma.diaryEntry.findFirst({
      where: { userId, userQuestId },
    });

    if (existing) {
      this.logger.log(`createFromQuestCompletion: Entry already exists for userQuest ${userQuestId}`);
      return existing;
    }

    // Auto-generate title with category emoji
    const catEmojis: Record<string, string> = {
      nature: '🌿', creativity: '🎨', kindness: '❤️', learning: '🧠',
      movement: '🏃', social: '👥', photography: '📸', relaxation: '🌙', adventure: '🗺️',
    };
    const emoji = catEmojis[data.category] || '🎯';
    const title = `${emoji} ${data.questTitle}`;

    return this.createEntry(userId, {
      questId,
      userQuestId,
      title,
      photoUrl: data.photoUrl,
      location: data.location,
      category: data.category,
      xpEarned: data.xpEarned,
      coinsEarned: data.coinsEarned,
    });
  }

  // ─── GET USER ENTRIES (with filters) ───────────────
  async getEntries(userId: string, filters?: DiaryFilters) {
    this.logger.log(`GetEntries: userId=${userId}`, filters);

    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.DiaryEntryWhereInput = {
      userId,
      isHidden: false,
    };

    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.mood) {
      where.mood = filters.mood as any;
    }
    if (filters?.isFavorite !== undefined) {
      where.isFavorite = filters.isFavorite;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }

    const [entries, total] = await Promise.all([
      this.prisma.diaryEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.diaryEntry.count({ where }),
    ]);

    const catEmojis: Record<string, string> = {
      nature: '🌿', creativity: '🎨', kindness: '❤️', learning: '🧠',
      movement: '🏃', social: '👥', photography: '📸', relaxation: '🌙', adventure: '🗺️',
    };

    const moodEmojis: Record<string, string> = {
      amazing: '🤩', happy: '😊', calm: '😌', tired: '😴', reflective: '🤔',
    };

    return {
      entries: entries.map(e => ({
        ...e,
        categoryEmoji: catEmojis[e.category || ''] || '🎯',
        moodEmoji: moodEmojis[e.mood || ''] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // ─── GET ENTRY BY ID ──────────────────────────────
  async getEntry(userId: string, entryId: string) {
    this.logger.log(`GetEntry: entryId=${entryId}`);

    const entry = await this.prisma.diaryEntry.findFirst({
      where: { id: entryId, userId, isHidden: false },
    });

    if (!entry) {
      throw new NotFoundException('Diary entry not found');
    }

    return entry;
  }

  // ─── UPDATE ENTRY ──────────────────────────────────
  async updateEntry(userId: string, entryId: string, dto: UpdateDiaryDto) {
    this.logger.log(`UpdateEntry: entryId=${entryId}`, dto);

    const existing = await this.prisma.diaryEntry.findFirst({
      where: { id: entryId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Diary entry not found');
    }

    const entry = await this.prisma.diaryEntry.update({
      where: { id: entryId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.mood !== undefined && { mood: dto.mood as any }),
        ...(dto.isFavorite !== undefined && { isFavorite: dto.isFavorite }),
        ...(dto.isHidden !== undefined && { isHidden: dto.isHidden }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
    });

    this.logger.log(`UpdateEntry: OK — id=${entryId}`);
    return entry;
  }

  // ─── TOGGLE FAVORITE ──────────────────────────────
  async toggleFavorite(userId: string, entryId: string) {
    this.logger.log(`ToggleFavorite: entryId=${entryId}`);

    const existing = await this.prisma.diaryEntry.findFirst({
      where: { id: entryId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Diary entry not found');
    }

    const entry = await this.prisma.diaryEntry.update({
      where: { id: entryId },
      data: { isFavorite: !existing.isFavorite },
    });

    this.logger.log(`ToggleFavorite: OK — isFavorite=${entry.isFavorite}`);
    return { entry, isFavorite: entry.isFavorite };
  }

  // ─── HIDE ENTRY (soft delete) ─────────────────────
  async hideEntry(userId: string, entryId: string) {
    this.logger.log(`HideEntry: entryId=${entryId}`);

    const existing = await this.prisma.diaryEntry.findFirst({
      where: { id: entryId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Diary entry not found');
    }

    await this.prisma.diaryEntry.update({
      where: { id: entryId },
      data: { isHidden: true },
    });

    this.logger.log(`HideEntry: OK — entry ${entryId} hidden`);
    return { message: 'Entry hidden from diary' };
  }

  // ─── GET FAVORITES ────────────────────────────────
  async getFavorites(userId: string) {
    this.logger.log(`GetFavorites: userId=${userId}`);

    const entries = await this.prisma.diaryEntry.findMany({
      where: { userId, isFavorite: true, isHidden: false },
      orderBy: { createdAt: 'desc' },
    });

    return { entries, count: entries.length };
  }

  // ─── GET BY CATEGORY ──────────────────────────────
  async getByCategory(userId: string, category: string) {
    this.logger.log(`GetByCategory: userId=${userId}, category=${category}`);

    const entries = await this.prisma.diaryEntry.findMany({
      where: { userId, category, isHidden: false },
      orderBy: { createdAt: 'desc' },
    });

    return { entries, count: entries.length, category };
  }

  // ─── GET CALENDAR VIEW ────────────────────────────
  async getCalendar(userId: string, year: number, month: number) {
    this.logger.log(`GetCalendar: userId=${userId}, year=${year}, month=${month}`);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const entries = await this.prisma.diaryEntry.findMany({
      where: {
        userId,
        isHidden: false,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        title: true,
        category: true,
        mood: true,
        photoUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by day
    const calendar: Record<number, any[]> = {};
    for (const entry of entries) {
      const day = new Date(entry.createdAt).getDate();
      if (!calendar[day]) calendar[day] = [];
      calendar[day].push(entry);
    }

    // Build month stats
    const totalDays = new Date(year, month, 0).getDate();
    const activeDays = Object.keys(calendar).length;
    const totalEntries = entries.length;

    const categoryCounts: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.category) {
        categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
      }
    }

    return {
      year,
      month,
      calendar,
      stats: {
        activeDays,
        totalDays,
        activityRate: Math.round((activeDays / totalDays) * 100),
        totalEntries,
        categoryCounts,
      },
    };
  }

  // ─── GET DIARY STATS ──────────────────────────────
  async getStats(userId: string) {
    this.logger.log(`GetStats: userId=${userId}`);

    const [
      totalEntries,
      favorites,
      byCategory,
      byMood,
      totalXp,
      totalCoins,
    ] = await Promise.all([
      this.prisma.diaryEntry.count({ where: { userId, isHidden: false } }),
      this.prisma.diaryEntry.count({ where: { userId, isFavorite: true, isHidden: false } }),
      this.prisma.diaryEntry.groupBy({
        by: ['category'],
        where: { userId, isHidden: false },
        _count: { category: true },
      }),
      this.prisma.diaryEntry.groupBy({
        by: ['mood'],
        where: { userId, isHidden: false, mood: { not: null } },
        _count: { mood: true },
      }),
      this.prisma.diaryEntry.aggregate({
        where: { userId, isHidden: false },
        _sum: { xpEarned: true },
      }),
      this.prisma.diaryEntry.aggregate({
        where: { userId, isHidden: false },
        _sum: { coinsEarned: true },
      }),
    ]);

    // First and last entry
    const firstEntry = await this.prisma.diaryEntry.findFirst({
      where: { userId, isHidden: false },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, title: true },
    });

    const lastEntry = await this.prisma.diaryEntry.findFirst({
      where: { userId, isHidden: false },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, title: true },
    });

    // Days since first entry
    const daysActive = firstEntry
      ? Math.max(1, Math.floor((Date.now() - new Date(firstEntry.createdAt).getTime()) / 86400000))
      : 0;

    return {
      totalEntries,
      favorites,
      totalXp: totalXp._sum.xpEarned || 0,
      totalCoins: totalCoins._sum.coinsEarned || 0,
      daysActive,
      avgEntriesPerDay: daysActive > 0 ? Math.round((totalEntries / daysActive) * 10) / 10 : 0,
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count.category })),      byMood: byMood.map(m => ({ mood: m.mood, count: m._count.mood })),
      firstEntry: firstEntry || null,
      lastEntry: lastEntry || null,
    };
  }

  // ─── SEARCH ENTRIES ───────────────────────────────
  async searchEntries(userId: string, query: string) {
    this.logger.log(`SearchEntries: userId=${userId}, query="${query}"`);

    const entries = await this.prisma.diaryEntry.findMany({
      where: {
        userId,
        isHidden: false,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { entries, count: entries.length, query };
  }

  // ─── TIMELINE (Instagram-style cursor pagination) ──
  async getTimeline(
    userId: string,
    cursor?: string, // entry ID to start after
    limit: number = 10,
    category?: string,
  ) {
    this.logger.log(`GetTimeline: userId=${userId}, cursor=${cursor || 'start'}, limit=${limit}`);

    const catEmojis: Record<string, string> = {
      nature: '🌿', creativity: '🎨', kindness: '❤️', learning: '🧠',
      movement: '🏃', social: '👥', photography: '📸', relaxation: '🌙', adventure: '🗺️',
    };
    const moodEmojis: Record<string, string> = {
      amazing: '🤩', happy: '😊', calm: '😌', tired: '😴', reflective: '🤔',
    };

    // Cursor-based: get entries after the cursor
    const where: Prisma.DiaryEntryWhereInput = {
      userId,
      isHidden: false,
    };

    if (category) {
      where.category = category;
    }

    // Cursor = entry ID. We need to find the createdAt of that entry
    // to do a proper cursor query.
    let cursorDate: Date | undefined;
    if (cursor) {
      const cursorEntry = await this.prisma.diaryEntry.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });
      if (cursorEntry) {
        cursorDate = cursorEntry.createdAt;
      }
    }

    if (cursorDate) {
      where.createdAt = { lt: cursorDate };
    }

    const entries = await this.prisma.diaryEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // fetch one extra to know if there's more
    });

    const hasMore = entries.length > limit;
    const timelineEntries = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? timelineEntries[timelineEntries.length - 1].id : null;

    // Group entries by month for timeline sections
    const sections: Record<string, any[]> = {};
    for (const entry of timelineEntries) {
      const date = new Date(entry.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });

      if (!sections[monthKey]) {
        sections[monthKey] = [];
      }
      sections[monthKey].push({
        ...entry,
        categoryEmoji: catEmojis[entry.category || ''] || '🎯',
        moodEmoji: moodEmojis[entry.mood || ''] || null,
        dayOfWeek: date.toLocaleDateString('es-ES', { weekday: 'long' }),
        dayOfMonth: date.getDate(),
        timeFormatted: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      });
    }

    // Convert to ordered array of sections
    const timelineSections = Object.entries(sections)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          key,
          label: date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }),
          entries: items,
          count: items.length,
          totalXp: items.reduce((sum: number, e: any) => sum + (e.xpEarned || 0), 0),
        };
      });

    return {
      sections: timelineSections,
      nextCursor,
      hasMore,
      total: await this.prisma.diaryEntry.count({ where: { userId, isHidden: false, ...(category ? { category } : {}) } }),
    };
  }

  // ─── MAP VIEW (entries with location + clustering) ──
  async getMapEntries(
    userId: string,
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    zoom?: number, // map zoom level (1-20), drives cluster distance
  ) {
    this.logger.log(`GetMapEntries: userId=${userId}, zoom=${zoom || 'auto'}`);

    const where: Prisma.DiaryEntryWhereInput = {
      userId,
      isHidden: false,
      location: { not: Prisma.JsonNull },
    };

    const entries = await this.prisma.diaryEntry.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        mood: true,
        photoUrl: true,
        location: true,
        createdAt: true,
        xpEarned: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const catEmojis: Record<string, string> = {
      nature: '🌿', creativity: '🎨', kindness: '❤️', learning: '🧠',
      movement: '🏃', social: '👥', photography: '📸', relaxation: '🌙', adventure: '🗺️',
    };

    // Filter by bounds if provided
    let filtered = entries;
    if (bounds) {
      filtered = entries.filter((e) => {
        const loc = e.location as any;
        if (!loc || loc.lat == null || loc.lng == null) return false;
        return (
          loc.lat >= bounds.south &&
          loc.lat <= bounds.north &&
          loc.lng >= bounds.west &&
          loc.lng <= bounds.east
        );
      });
    }

    // ─── CLUSTERING ─────────────────────────────────
    // Determine cluster radius based on zoom level
    // Higher zoom = smaller clusters (more detail)
    // Lower zoom = bigger clusters (more grouped)
    const clusterRadiusKm = this.getClusterRadius(zoom);

    const { clusters, singles } = this.clusterMarkers(filtered, clusterRadiusKm, catEmojis);

    // Group by category for legend
    const categoryCounts: Record<string, number> = {};
    for (const e of filtered) {
      const cat = e.category || 'unknown';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    // Calculate center point
    let centerLat = 0;
    let centerLng = 0;
    let validCount = 0;
    for (const e of filtered) {
      const loc = e.location as any;
      if (loc?.lat && loc?.lng) {
        centerLat += loc.lat;
        centerLng += loc.lng;
        validCount++;
      }
    }
    if (validCount > 0) {
      centerLat /= validCount;
      centerLng /= validCount;
    }

    return {
      items: [...clusters, ...singles],
      stats: {
        totalMarkers: filtered.length,
        totalWithLocation: entries.length,
        clusterCount: clusters.length,
        singleCount: singles.length,
        clusterRadiusKm,
      },
      center: validCount > 0 ? { lat: centerLat, lng: centerLng } : null,
      categoryCounts: Object.entries(categoryCounts)
        .map(([cat, count]) => ({ category: cat, count, emoji: catEmojis[cat] || '🎯' }))
        .sort((a, b) => b.count - a.count),
      bounds: bounds || null,
    };
  }

  // ─── GET CLUSTER DETAIL (expand cluster) ──────────
  async getClusterDetail(userId: string, clusterIds: string[]) {
    this.logger.log(`GetClusterDetail: userId=${userId}, ids=${clusterIds.length}`);

    const catEmojis: Record<string, string> = {
      nature: '🌿', creativity: '🎨', kindness: '❤️', learning: '🧠',
      movement: '🏃', social: '👥', photography: '📸', relaxation: '🌙', adventure: '🗺️',
    };
    const moodEmojis: Record<string, string> = {
      amazing: '🤩', happy: '😊', calm: '😌', tired: '😴', reflective: '🤔',
    };

    const entries = await this.prisma.diaryEntry.findMany({
      where: {
        id: { in: clusterIds },
        userId,
        isHidden: false,
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        mood: true,
        photoUrl: true,
        location: true,
        createdAt: true,
        xpEarned: true,
        coinsEarned: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      entries: entries.map((e) => ({
        ...e,
        categoryEmoji: catEmojis[e.category || ''] || '🎯',
        moodEmoji: moodEmojis[e.mood || ''] || null,
      })),
      count: entries.length,
    };
  }

  // ─── CLUSTER ALGORITHM (grid-based, O(n)) ─────────
  private clusterMarkers(
    entries: any[],
    radiusKm: number,
    catEmojis: Record<string, string>,
  ): { clusters: any[]; singles: any[] } {
    if (entries.length === 0) return { clusters: [], singles: [] };

    // Grid-based clustering: assign each point to a grid cell
    // Grid cell size = radiusKm
    const gridCells: Map<string, any[]> = new Map();

    for (const entry of entries) {
      const loc = entry.location as any;
      if (!loc || loc.lat == null || loc.lng == null) continue;

      // Convert to grid cell coordinates
      const gridLat = Math.floor(loc.lat / (radiusKm / 111)); // 1 degree lat ≈ 111km
      const gridLng = Math.floor(loc.lng / (radiusKm / (111 * Math.cos(loc.lat * Math.PI / 180))));
      const cellKey = `${gridLat}:${gridLng}`;

      if (!gridCells.has(cellKey)) {
        gridCells.set(cellKey, []);
      }
      gridCells.get(cellKey)!.push(entry);
    }

    const clusters: any[] = [];
    const singles: any[] = [];

    for (const [, cellEntries] of gridCells) {
      if (cellEntries.length === 1) {
        // Single marker — return as-is
        const e = cellEntries[0];
        singles.push({
          type: 'marker' as const,
          id: e.id,
          title: e.title,
          category: e.category,
          categoryEmoji: catEmojis[e.category || ''] || '🎯',
          mood: e.mood,
          photoUrl: e.photoUrl,
          location: e.location,
          createdAt: e.createdAt,
          xpEarned: e.xpEarned,
        });
      } else {
        // Cluster — group nearby markers
        const centerLat = cellEntries.reduce((sum: number, e: any) => {
          const loc = e.location as any;
          return sum + (loc?.lat || 0);
        }, 0) / cellEntries.length;

        const centerLng = cellEntries.reduce((sum: number, e: any) => {
          const loc = e.location as any;
          return sum + (loc?.lng || 0);
        }, 0) / cellEntries.length;

        // Category distribution in cluster
        const catDist: Record<string, number> = {};
        for (const e of cellEntries) {
          const cat = e.category || 'unknown';
          catDist[cat] = (catDist[cat] || 0) + 1;
        }

        // Most recent entry's photo as cluster thumbnail
        const latest = cellEntries.sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

        clusters.push({
          type: 'cluster' as const,
          id: `cluster-${centerLat.toFixed(4)}-${centerLng.toFixed(4)}`,
          count: cellEntries.length,
          center: { lat: centerLat, lng: centerLng },
          location: latest.location, // most recent location
          thumbnailPhoto: latest.photoUrl,
          primaryCategory: Object.entries(catDist).sort((a, b) => b[1] - a[1])[0]?.[0],
          primaryCategoryEmoji: catEmojis[Object.entries(catDist).sort((a, b) => b[1] - a[1])[0]?.[0] || ''] || '🎯',
          categoryDistribution: Object.entries(catDist)
            .map(([cat, count]) => ({ category: cat, count, emoji: catEmojis[cat] || '🎯' })),
          totalXp: cellEntries.reduce((sum: number, e: any) => sum + (e.xpEarned || 0), 0),
          dateRange: {
            from: cellEntries[cellEntries.length - 1].createdAt,
            to: cellEntries[0].createdAt,
          },
          entryIds: cellEntries.map((e: any) => e.id),
        });
      }
    }

    return { clusters, singles };
  }

  // ─── CLUSTER RADIUS BY ZOOM ───────────────────────
  private getClusterRadius(zoom?: number): number {
    // Returns cluster radius in km based on zoom level
    // Zoom 1-3 (country view):   100km clusters
    // Zoom 4-6 (city view):      20km clusters
    // Zoom 7-9 (district view):  5km clusters
    // Zoom 10-12 (street view):  1km clusters
    // Zoom 13-15 (block view):   0.3km (300m) clusters
    // Zoom 16+ (building view):  no clustering (all singles)
    if (!zoom) return 5; // default: district level

    if (zoom >= 16) return 0;     // no clustering
    if (zoom >= 13) return 0.3;   // 300m
    if (zoom >= 10) return 1;     // 1km
    if (zoom >= 7) return 5;      // 5km
    if (zoom >= 4) return 20;     // 20km
    return 100;                    // 100km
  }

  // ─── TIMELINE STATS ───────────────────────────────
  async getTimelineStats(userId: string) {
    this.logger.log(`GetTimelineStats: userId=${userId}`);

    const entries = await this.prisma.diaryEntry.findMany({
      where: { userId, isHidden: false },
      select: {
        createdAt: true,
        category: true,
        mood: true,
        xpEarned: true,
        coinsEarned: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (entries.length === 0) {
      return {
        totalEntries: 0,
        monthsActive: 0,
        currentStreakDays: 0,
        longestStreakDays: 0,
        mostActiveDay: null,
        mostActiveMonth: null,
        monthlyActivity: [],
        dayOfWeekActivity: [],
        heatmap: {},
      };
    }

    // ─── Monthly activity ───────────────────────────
    const monthlyMap: Record<string, { count: number; xp: number; coins: number }>
      = {};
    for (const e of entries) {
      const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { count: 0, xp: 0, coins: 0 };
      monthlyMap[key].count++;
      monthlyMap[key].xp += e.xpEarned;
      monthlyMap[key].coins += e.coinsEarned;
    }

    const monthlyActivity = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [y, m] = key.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1);
        return {
          month: key,
          label: date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' }),
          ...data,
        };
      });

    const mostActiveMonth = monthlyActivity.sort((a, b) => b.count - a.count)[0];

    // ─── Day of week activity ───────────────────────
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayOfWeekCount = new Array(7).fill(0);
    for (const e of entries) {
      dayOfWeekCount[new Date(e.createdAt).getDay()]++;
    }
    const dayOfWeekActivity = dayNames.map((name, i) => ({
      day: name,
      index: i,
      count: dayOfWeekCount[i],
      percentage: Math.round((dayOfWeekCount[i] / entries.length) * 100),
    }));
    const mostActiveDay = dayOfWeekActivity.sort((a, b) => b.count - a.count)[0];

    // ─── Calendar heatmap (last 365 days) ───────────
    const heatmap: Record<string, number> = {};
    const now = new Date();
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    for (const e of entries) {
      const d = new Date(e.createdAt);
      if (d >= yearAgo) {
        const dayKey = d.toISOString().split('T')[0];
        heatmap[dayKey] = (heatmap[dayKey] || 0) + 1;
      }
    }

    // ─── Streaks ────────────────────────────────────
    const uniqueDays = [...new Set(
      entries.map(e => new Date(e.createdAt).toISOString().split('T')[0])
    )].sort();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

    // Check if streak is active (today or yesterday)
    const lastDay = uniqueDays[uniqueDays.length - 1];
    if (lastDay === today || lastDay === yesterday) {
      currentStreak = 1;
      for (let i = uniqueDays.length - 2; i >= 0; i--) {
        const prev = new Date(uniqueDays[i + 1]);
        const curr = new Date(uniqueDays[i]);
        const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Longest streak
    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1]);
      const curr = new Date(uniqueDays[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      totalEntries: entries.length,
      monthsActive: monthlyActivity.length,
      currentStreakDays: currentStreak,
      longestStreakDays: longestStreak,
      mostActiveDay: { name: mostActiveDay.day, entries: mostActiveDay.count, percentage: mostActiveDay.percentage },
      mostActiveMonth: mostActiveMonth ? { key: mostActiveMonth.month, label: mostActiveMonth.label, entries: mostActiveMonth.count } : null,
      monthlyActivity,
      dayOfWeekActivity,
      heatmap,
    };
  }
}