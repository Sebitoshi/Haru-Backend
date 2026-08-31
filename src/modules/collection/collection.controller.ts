import { Controller, Get, Post, Patch, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CollectionService } from './collection.service';

@ApiTags('Collection')
@ApiBearerAuth()
@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  // ─── GET CATALOG ──────────────────────────────────
  @Get('catalog')
  @ApiOperation({
    summary: 'Get full collectible catalog',
    description: 'Returns all collectibles grouped by type with user unlock status.',
  })
  @ApiResponse({ status: 200, description: 'Returns catalog with unlock status per item' })
  async getCatalog(@Request() req: any) {
    return this.collectionService.getCatalog(req.user.id);
  }

  // ─── GET USER COLLECTION ──────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Get your collected items' })
  @ApiQuery({ name: 'type', required: false, enum: ['badge', 'plant', 'object', 'postcard', 'special'] })
  @ApiQuery({ name: 'unseen', required: false, type: Boolean, description: 'Only unseen items' })
  @ApiResponse({ status: 200, description: 'Returns user collection' })
  async getMyCollection(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('unseen') unseen?: string,
  ) {
    return this.collectionService.getUserCollection(
      req.user.id,
      type,
      unseen === 'true',
    );
  }

  // ─── GET UNSEEN COUNT ─────────────────────────────
  @Get('me/unseen')
  @ApiOperation({ summary: 'Get count of unseen collectibles' })
  @ApiResponse({ status: 200, description: 'Returns unseen count' })
  async getUnseenCount(@Request() req: any) {
    return this.collectionService.getUnseenCount(req.user.id);
  }

  // ─── MARK AS SEEN ────────────────────────────────
  @Patch('me/:collectibleId/seen')
  @ApiOperation({ summary: 'Mark a collectible as seen' })
  @ApiResponse({ status: 200, description: 'Marked as seen' })
  async markAsSeen(@Request() req: any, @Param('collectibleId') collectibleId: string) {
    return this.collectionService.markAsSeen(req.user.id, collectibleId);
  }

  // ─── MARK ALL AS SEEN ────────────────────────────
  @Patch('me/seen-all')
  @ApiOperation({ summary: 'Mark all collectibles as seen' })
  @ApiResponse({ status: 200, description: 'All marked as seen' })
  async markAllAsSeen(@Request() req: any) {
    return this.collectionService.markAllAsSeen(req.user.id);
  }

  // ─── GET STATS ────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get collection statistics' })
  @ApiResponse({ status: 200, description: 'Returns collection stats with progress by type and rarity' })
  async getStats(@Request() req: any) {
    return this.collectionService.getStats(req.user.id);
  }

  // ─── SEED COLLECTIBLES ───────────────────────────
  @Post('seed')
  @ApiOperation({ summary: 'Seed all collectibles into the catalog' })
  @ApiResponse({ status: 201, description: 'Collectibles seeded' })
  async seed() {
    return this.collectionService.seedCollectibles();
  }
}
