import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsIn,
  IsHexColor,
  MaxLength,
  IsObject,
} from 'class-validator';

export class UpdateBotiDto {
  @ApiPropertyOptional({ example: 'Mi BOTI' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  name?: string;

  @ApiPropertyOptional({ enum: ['standard', 'round', 'tall', 'small'] })
  @IsOptional()
  @IsIn(['standard', 'round', 'tall', 'small'])
  bodyType?: string;

  @ApiPropertyOptional({ example: '#4FC3F7' })
  @IsOptional()
  @IsHexColor()
  bodyColor?: string;

  @ApiPropertyOptional({ enum: ['round', 'dot', 'anime', 'cool'] })
  @IsOptional()
  @IsIn(['round', 'dot', 'anime', 'cool'])
  eyeStyle?: string;

  @ApiPropertyOptional({ enum: ['smile', 'open', 'flat', 'grin'] })
  @IsOptional()
  @IsIn(['smile', 'open', 'flat', 'grin'])
  mouthStyle?: string;

  @ApiPropertyOptional({
    example: { playfulness: 0.7, curiosity: 0.8, energy: 0.6 },
  })
  @IsOptional()
  @IsObject()
  personality?: {
    playfulness?: number;
    curiosity?: number;
    energy?: number;
  };
}
