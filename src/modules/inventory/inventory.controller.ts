import {
  Controller, Get, Post, Delete, Param, Query, Req,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';

@ApiTags('🎒 Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: '🎒 Mi inventario' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'slot', required: false, type: String })
  @ApiQuery({ name: 'equipped', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getInventory(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('slot') slot?: string,
    @Query('equipped') equipped?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.inventoryService.getInventory(req.user.id, {
      category, slot,
      equipped: equipped === 'true' ? true : equipped === 'false' ? false : undefined,
      page, limit,
    });
  }

  @Get('equipped')
  @ApiOperation({ summary: '👗 Mis items equipados + preview de Boti' })
  async getEquipped(@Req() req: any) {
    return this.inventoryService.getEquipped(req.user.id);
  }

  @Post('equip/:code')
  @ApiOperation({ summary: '✅ Equipar item' })
  async equipItem(@Req() req: any, @Param('code') code: string) {
    return this.inventoryService.equipItem(req.user.id, code);
  }

  @Delete('unequip/:slot')
  @ApiOperation({ summary: '❌ Desequipar slot' })
  async unequipSlot(@Req() req: any, @Param('slot') slot: string) {
    return this.inventoryService.unequipSlot(req.user.id, slot);
  }
}
