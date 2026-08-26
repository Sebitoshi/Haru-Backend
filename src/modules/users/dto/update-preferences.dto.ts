import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsBoolean } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ enum: ['system', 'light', 'dark'], default: 'system' })
  @IsOptional()
  @IsIn(['system', 'light', 'dark'])
  theme?: string;

  @ApiPropertyOptional({ enum: ['es', 'en'], default: 'es' })
  @IsOptional()
  @IsIn(['es', 'en'])
  language?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sound?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notifications?: boolean;
}
