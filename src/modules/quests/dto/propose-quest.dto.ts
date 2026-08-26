import { IsString, IsEnum, IsNumber, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestCategoryDto, QuestDifficultyDto } from './create-quest.dto';

export class QuestStepDto {
  @ApiProperty({ example: 'Encuentra una flor' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Busca una flor de cualquier color en tu entorno' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'photo', enum: ['photo', 'text', 'location', 'action'] })
  @IsString()
  type: string;
}

export class ProposeQuestDto {
  @ApiProperty({ example: 'Aventura Botánica' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Sal a explorar y encuentra 3 flores diferentes. Tómales fotos.' })
  @IsString()
  description: string;

  @ApiProperty({ enum: QuestCategoryDto, example: QuestCategoryDto.nature })
  @IsEnum(QuestCategoryDto)
  category: QuestCategoryDto;

  @ApiPropertyOptional({ enum: QuestDifficultyDto, default: QuestDifficultyDto.normal })
  @IsOptional()
  @IsEnum(QuestDifficultyDto)
  difficulty?: QuestDifficultyDto;

  @ApiProperty({ example: 20, description: 'Duration in minutes' })
  @IsNumber()
  @Min(1)
  @Max(480)
  duration: number;

  @ApiPropertyOptional({ type: [QuestStepDto], description: 'Multi-step quest steps' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestStepDto)
  steps?: QuestStepDto[];

  @ApiPropertyOptional({ example: 'El usuario parece aburrido, tiene 20 minutos' })
  @IsOptional()
  @IsString()
  reasoning?: string;
}
