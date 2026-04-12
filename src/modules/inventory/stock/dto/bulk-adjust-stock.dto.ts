import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AdjustStockDto } from './adjust-stock.dto';

export class BulkAdjustStockDto {
  @ApiProperty({
    type: [AdjustStockDto],
    description: 'List of stock adjustments to apply atomically',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustStockDto)
  items: AdjustStockDto[];

  @ApiPropertyOptional({ example: 'Monthly physical count — April 2026' })
  @IsOptional()
  @IsString()
  note?: string;
}
