import { Controller, Get, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomizationService } from './customization.service';

@ApiTags('👕 Customization')
@ApiBearerAuth()
@Controller('customization')
export class CustomizationController {
  constructor(private readonly customizationService: CustomizationService) {}

  @Get('boti')
  @ApiOperation({ summary: '🤖 Apariencia actual de Boti' })
  async getBotiAppearance(@Req() req: any) {
    return this.customizationService.getBotiAppearance(req.user.id);
  }

  @Post('preview')
  @ApiOperation({ summary: '👁️ Preview de combinación antes de equipar' })
  async previewCombination(
    @Req() req: any,
    @Body() body: { items: { slot: string; itemId: string }[] },
  ) {
    return this.customizationService.previewCombination(req.user.id, body.items);
  }

  @Get('presets')
  @ApiOperation({ summary: '🎨 Presets de Boti' })
  async getPresets() {
    return this.customizationService.getPresets();
  }

  @Post('presets/:presetId/apply')
  @ApiOperation({ summary: '✅ Aplicar preset' })
  async applyPreset(@Req() req: any, @Param('presetId') presetId: string) {
    return this.customizationService.applyPreset(req.user.id, presetId);
  }

  @Post('presets/save')
  @ApiOperation({ summary: '💾 Guardar configuración actual como preset' })
  async savePreset(
    @Req() req: any,
    @Body() body: { name: string },
  ) {
    return this.customizationService.saveAsPreset(req.user.id, body.name);
  }

  @Get('presets/user')
  @ApiOperation({ summary: '📋 Mis presets guardados' })
  async getUserPresets(@Req() req: any) {
    return this.customizationService.getUserPresets(req.user.id);
  }

  @Delete('reset')
  @ApiOperation({ summary: '🔄 Resetear Boti a defaults' })
  async resetToDefault(@Req() req: any) {
    return this.customizationService.resetToDefault(req.user.id);
  }
}
