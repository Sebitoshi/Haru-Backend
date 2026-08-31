import {
  Controller, Get, Post, Param, Query, Req, Body,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ShopService } from './shop.service';
import { ShopItemCategory, ShopItemRarity } from '@prisma/client';

@ApiTags('🛍️ Shop')
@ApiBearerAuth()
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('catalog')
  @ApiOperation({ summary: '🛒 Catálogo visual de la tienda' })
  @ApiQuery({ name: 'category', required: false, enum: ShopItemCategory })
  @ApiQuery({ name: 'slot', required: false, type: String })
  @ApiQuery({ name: 'rarity', required: false, enum: ShopItemRarity })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, enum: ['price_asc', 'price_desc', 'newest', 'rarity'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCatalog(
    @Req() req: any,
    @Query('category') category?: ShopItemCategory,
    @Query('slot') slot?: string,
    @Query('rarity') rarity?: ShopItemRarity,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.shopService.getCatalog(req.user.id, {
      category, slot, rarity, search,
      sort: sort as any, page, limit,
    });
  }

  @Get('item/:code')
  @ApiOperation({ summary: '📦 Detalle de un item' })
  async getItemDetail(@Req() req: any, @Param('code') code: string) {
    return this.shopService.getItemDetail(req.user.id, code);
  }

  @Post('buy/:code')
  @ApiOperation({ summary: '🛍️ Comprar item' })
  async buyItem(
    @Req() req: any,
    @Param('code') code: string,
    @Body('quantity', new DefaultValuePipe(1), ParseIntPipe) quantity?: number,
  ) {
    return this.shopService.buyItem(req.user.id, code, quantity || 1);
  }

  @Get('categories')
  @ApiOperation({ summary: '📂 Categorías y slots disponibles' })
  async getCategories() {
    return this.shopService.getCategories();
  }
}
