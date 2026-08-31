import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery,
} from '@nestjs/swagger';
import { DiaryService, CreateDiaryDto, UpdateDiaryDto } from './diary.service';
import type { DiaryFilters } from './diary.service';

@ApiTags('Diary')
@ApiBearerAuth()
@Controller('diary')
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  // ─── CREATE ENTRY ──────────────────────────────────
  @Post('entries')
  @ApiOperation({ summary: 'Create a diary entry' })
  @ApiResponse({ status: 201, description: 'Entry created' })
  async createEntry(@Request() req: any, @Body() dto: any) {
    return this.diaryService.createEntry(req.user.id, dto);
  }

  // ─── GET ENTRIES (with filters) ────────────────────
  @Get('entries')
  @ApiOperation({ summary: 'Get diary entries with filters' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'mood', required: false })
  @ApiQuery({ name: 'isFavorite', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns entries with pagination' })
  async getEntries(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('mood') mood?: string,
    @Query('isFavorite') isFavorite?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: DiaryFilters = {
      category,
      mood,
      isFavorite: isFavorite !== undefined ? isFavorite === 'true' : undefined,
      startDate,
      endDate,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    };
    return this.diaryService.getEntries(req.user.id, filters);
  }

  // ─── GET ENTRY BY ID ──────────────────────────────
  @Get('entries/:id')
  @ApiOperation({ summary: 'Get a diary entry by ID' })
  @ApiResponse({ status: 200, description: 'Returns entry' })
  async getEntry(@Request() req: any, @Param('id') id: string) {
    return this.diaryService.getEntry(req.user.id, id);
  }

  // ─── UPDATE ENTRY ──────────────────────────────────
  @Patch('entries/:id')
  @ApiOperation({ summary: 'Update a diary entry' })
  @ApiResponse({ status: 200, description: 'Entry updated' })
  async updateEntry(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.diaryService.updateEntry(req.user.id, id, dto);
  }

  // ─── TOGGLE FAVORITE ──────────────────────────────
  @Patch('entries/:id/favorite')
  @ApiOperation({ summary: 'Toggle favorite on a diary entry' })
  @ApiResponse({ status: 200, description: 'Favorite toggled' })
  async toggleFavorite(@Request() req: any, @Param('id') id: string) {
    return this.diaryService.toggleFavorite(req.user.id, id);
  }

  // ─── HIDE ENTRY ───────────────────────────────────
  @Delete('entries/:id')
  @ApiOperation({ summary: 'Hide a diary entry (soft delete)' })
  @ApiResponse({ status: 200, description: 'Entry hidden' })
  async hideEntry(@Request() req: any, @Param('id') id: string) {
    return this.diaryService.hideEntry(req.user.id, id);
  }

  // ─── GET FAVORITES ────────────────────────────────
  @Get('favorites')
  @ApiOperation({ summary: 'Get all favorite diary entries' })
  @ApiResponse({ status: 200, description: 'Returns favorite entries' })
  async getFavorites(@Request() req: any) {
    return this.diaryService.getFavorites(req.user.id);
  }

  // ─── GET BY CATEGORY ──────────────────────────────
  @Get('category/:category')
  @ApiOperation({ summary: 'Get diary entries by category' })
  @ApiResponse({ status: 200, description: 'Returns entries for category' })
  async getByCategory(@Request() req: any, @Param('category') category: string) {
    return this.diaryService.getByCategory(req.user.id, category);
  }

  // ─── GET CALENDAR VIEW ────────────────────────────
  @Get('calendar/:year/:month')
  @ApiOperation({ summary: 'Get diary calendar view for a month' })
  @ApiResponse({ status: 200, description: 'Returns calendar with entries grouped by day' })
  async getCalendar(
    @Request() req: any,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.diaryService.getCalendar(req.user.id, parseInt(year), parseInt(month));
  }

  // ─── GET DIARY STATS ──────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get diary statistics' })
  @ApiResponse({ status: 200, description: 'Returns diary stats' })
  async getStats(@Request() req: any) {
    return this.diaryService.getStats(req.user.id);
  }

  // ─── SEARCH ENTRIES ───────────────────────────────
  @Get('search')
  @ApiOperation({ summary: 'Search diary entries' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Returns matching entries' })
  async searchEntries(@Request() req: any, @Query('q') query: string) {
    return this.diaryService.searchEntries(req.user.id, query);
  }

  // ─── TIMELINE (Instagram-style) ──────────────────
  @Get('timeline')
  @ApiOperation({
    summary: 'Get diary timeline (Instagram-style infinite scroll)',
    description: 'Cursor-based pagination grouped by month. Send cursor from previous response to load more.',
  })
  @ApiQuery({ name: 'cursor', required: false, description: 'Entry ID to load entries after' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Entries per page (default 10)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'Returns timeline sections with cursor for infinite scroll' })
  async getTimeline(
    @Request() req: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    return this.diaryService.getTimeline(
      req.user.id,
      cursor,
      limit ? parseInt(limit) : 10,
      category,
    );
  }

  // ─── MAP VIEW (with clustering) ──────────────────
  @Get('map')
  @ApiOperation({
    summary: 'Get diary entries on a map with clustering',
    description: 'Returns markers clustered by proximity. Use zoom param to control cluster granularity (1-20). Higher zoom = more detail.',
  })
  @ApiQuery({ name: 'north', required: false, type: Number, description: 'Map bounds north latitude' })
  @ApiQuery({ name: 'south', required: false, type: Number, description: 'Map bounds south latitude' })
  @ApiQuery({ name: 'east', required: false, type: Number, description: 'Map bounds east longitude' })
  @ApiQuery({ name: 'west', required: false, type: Number, description: 'Map bounds west longitude' })
  @ApiQuery({ name: 'zoom', required: false, type: Number, description: 'Map zoom level 1-20. 1=country, 7=city, 13=street, 16+=building' })
  @ApiResponse({ status: 200, description: 'Returns clustered markers with stats' })
  async getMapEntries(
    @Request() req: any,
    @Query('north') north?: string,
    @Query('south') south?: string,
    @Query('east') east?: string,
    @Query('west') west?: string,
    @Query('zoom') zoom?: string,
  ) {
    const bounds = (north && south && east && west)
      ? {
          north: parseFloat(north),
          south: parseFloat(south),
          east: parseFloat(east),
          west: parseFloat(west),
        }
      : undefined;
    return this.diaryService.getMapEntries(req.user.id, bounds, zoom ? parseInt(zoom) : undefined);
  }

  // ─── CLUSTER DETAIL (expand cluster) ──────────────
  @Get('map/cluster')
  @ApiOperation({
    summary: 'Expand a cluster to see individual entries',
    description: 'Pass comma-separated entry IDs from the cluster.entryIds to see full details.',
  })
  @ApiQuery({ name: 'ids', required: true, description: 'Comma-separated entry IDs from the cluster' })
  @ApiResponse({ status: 200, description: 'Returns individual entries in the cluster' })
  async getClusterDetail(
    @Request() req: any,
    @Query('ids') ids: string,
  ) {
    const idArray = ids.split(',').map(id => id.trim()).filter(id => id);
    return this.diaryService.getClusterDetail(req.user.id, idArray);
  }

  // ─── TIMELINE STATS ──────────────────────────────
  @Get('timeline/stats')
  @ApiOperation({
    summary: 'Get timeline statistics',
    description: 'Monthly activity, streaks, most active days, heatmap for the last 365 days.',
  })
  @ApiResponse({ status: 200, description: 'Returns timeline stats with heatmap and streak data' })
  async getTimelineStats(@Request() req: any) {
    return this.diaryService.getTimelineStats(req.user.id);
  }
}
