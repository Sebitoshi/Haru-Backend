import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum QuestCategoryDto {
  nature = 'nature',
  creativity = 'creativity',
  kindness = 'kindness',
  learning = 'learning',
  movement = 'movement',
  social = 'social',
  photography = 'photography',
  relaxation = 'relaxation',
  adventure = 'adventure',
}

export enum QuestDifficultyDto {
  easy = 'easy',
  normal = 'normal',
  hard = 'hard',
  special = 'special',
}

export enum QuestTypeDto {
  daily = 'daily',
  weekly = 'weekly',
  regular = 'regular',
  special = 'special',
  ai_generated = 'ai_generated',
  surprise = 'surprise',
}

export class CreateQuestDto {
  @ApiProperty({ example: 'Encuentra una flor amarilla' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Sal a caminar y encuentra una flor de color amarillo. Tómale una foto.' })
  @IsString()
  description: string;

  @ApiProperty({ enum: QuestCategoryDto, example: QuestCategoryDto.nature })
  @IsEnum(QuestCategoryDto)
  category: QuestCategoryDto;

  @ApiPropertyOptional({ enum: QuestDifficultyDto, default: QuestDifficultyDto.normal })
  @IsOptional()
  @IsEnum(QuestDifficultyDto)
  difficulty?: QuestDifficultyDto;

  @ApiProperty({ example: 15, description: 'Duration in minutes' })
  @IsNumber()
  @Min(1)
  @Max(480)
  duration: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  xpReward?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  coinsReward?: number;

  @ApiPropertyOptional({ enum: QuestTypeDto, default: QuestTypeDto.regular })
  @IsOptional()
  @IsEnum(QuestTypeDto)
  type?: QuestTypeDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAIGenerated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
