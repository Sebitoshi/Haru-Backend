import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestCategoryDto, QuestDifficultyDto } from './create-quest.dto';

export class QuestFiltersDto {
  @ApiPropertyOptional({ enum: QuestCategoryDto })
  @IsOptional()
  @IsEnum(QuestCategoryDto)
  category?: QuestCategoryDto;

  @ApiPropertyOptional({ enum: QuestDifficultyDto })
  @IsOptional()
  @IsEnum(QuestDifficultyDto)
  difficulty?: QuestDifficultyDto;

  @ApiPropertyOptional({ example: 30, description: 'Max duration in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxDuration?: number;

  @ApiPropertyOptional({ example: 'flores' })
  @IsOptional()
  @IsString()
  search?: string;
}
