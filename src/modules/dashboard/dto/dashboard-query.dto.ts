import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DashboardRange {
  TODAY = 'today',
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  LAST_90_DAYS = '90d',
  LAST_YEAR = '1y',
  ALL_TIME = 'all',
}

export class RangeQueryDto {
  @ApiPropertyOptional({
    enum: DashboardRange,
    example: DashboardRange.LAST_30_DAYS,
    description: 'Time window for the aggregation',
    default: DashboardRange.LAST_30_DAYS,
  })
  @IsOptional()
  @IsEnum(DashboardRange)
  range?: DashboardRange = DashboardRange.LAST_30_DAYS;
}

export class RangeLimitQueryDto extends RangeQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of rows to return',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class LimitQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of rows to return',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;
}

export class LowStockQueryDto {
  @ApiPropertyOptional({
    description: 'Products with stock <= threshold will be returned',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  threshold?: number = 5;
}
