import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EconomyService } from './economy.service';
import { TransactionType, ShopItemCategory } from '@prisma/client';

@ApiTags('🪙 Economy')
@ApiBearerAuth()
@Controller('economy')
export class EconomyController {
  constructor(private readonly economyService: EconomyService) {}

  // ═══════════════════════════════════════════════════
  // BALANCE
  // ═══════════════════════════════════════════════════

  @Get('balance')
  @ApiOperation({ summary: '💰 Mi balance de coins' })
  async getBalance(@Req() req: any) {
    return this.economyService.getBalance(req.user.id);
  }

  // ═══════════════════════════════════════════════════
  // TRANSACTIONS
  // ═══════════════════════════════════════════════════

  @Get('transactions')
  @ApiOperation({ summary: '📜 Historial de transacciones' })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async getTransactions(
    @Req() req: any,
    @Query('type') type?: TransactionType,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.economyService.getTransactions(req.user.id, {
      type,
      page,
      limit,
      from,
      to,
    });
  }

  @Get('transactions/summary')
  @ApiOperation({ summary: '📊 Resumen de transacciones por período' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month', 'all'] })
  async getTransactionSummary(
    @Req() req: any,
    @Query('period') period?: 'today' | 'week' | 'month' | 'all',
  ) {
    return this.economyService.getTransactionSummary(req.user.id, period || 'all');
  }

  // ═══════════════════════════════════════════════════
  // SHOP
  // ═══════════════════════════════════════════════════

  @Get('shop')
  @ApiOperation({ summary: '🛒 Catálogo de la tienda' })
  @ApiQuery({ name: 'category', required: false, enum: ShopItemCategory })
  async getShopCatalog(
    @Req() req: any,
    @Query('category') category?: ShopItemCategory,
  ) {
    return this.economyService.getShopCatalog(req.user.id, category);
  }

  @Post('shop/buy/:itemCode')
  @ApiOperation({ summary: '🛍️ Comprar item de la tienda' })
  async buyItem(
    @Req() req: any,
    @Param('itemCode') itemCode: string,
    @Body('quantity', new DefaultValuePipe(1), ParseIntPipe) quantity?: number,
  ) {
    return this.economyService.buyItem(req.user.id, itemCode, quantity || 1);
  }

  @Get('shop/history')
  @ApiOperation({ summary: '📦 Mi historial de compras' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPurchaseHistory(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.economyService.getPurchaseHistory(req.user.id, page, limit);
  }
}
