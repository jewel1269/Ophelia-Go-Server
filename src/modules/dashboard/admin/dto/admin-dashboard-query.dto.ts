import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
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

export enum SalesType {
  STATUS = 'status',
  PAYMENT_METHOD = 'payment-method',
  CATEGORY = 'category',
  BRAND = 'brand',
  ALL = 'all',
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

export class SalesQueryDto extends RangeQueryDto {
  @ApiPropertyOptional({
    enum: SalesType,
    example: SalesType.STATUS,
    description:
      'Which dimension to group by. ' +
      'status = by order status, ' +
      'payment-method = by gateway (PAID only), ' +
      'category = by product category, ' +
      'brand = by brand, ' +
      'all = returns all four groups at once.',
    default: SalesType.ALL,
  })
  @IsOptional()
  @IsEnum(SalesType)
  type?: SalesType = SalesType.ALL;
}

export enum TopType {
  PRODUCTS = 'products',
  CUSTOMERS = 'customers',
  CATEGORIES = 'categories',
  BRANDS = 'brands',
}

export class TopQueryDto {
  @ApiPropertyOptional({
    enum: TopType,
    example: TopType.PRODUCTS,
    description:
      'Which dimension to rank: ' +
      'products = top selling products (by units), ' +
      'customers = top spending customers, ' +
      'categories = top categories by revenue, ' +
      'brands = top brands by revenue.',
    default: TopType.PRODUCTS,
  })
  @IsOptional()
  @IsEnum(TopType)
  type?: TopType = TopType.PRODUCTS;

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

  @ApiPropertyOptional({
    description: 'Start date (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
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

export enum CustomerType {
  NEW_SIGNUPS = 'new-signups',
  RETURNING_VS_NEW = 'returning-vs-new',
  LOCATIONS = 'locations',
  ALL = 'all',
}

export class CustomerQueryDto {
  @ApiPropertyOptional({
    enum: CustomerType,
    default: CustomerType.ALL,
    description:
      'new-signups = daily new customer time series, ' +
      'returning-vs-new = first-time vs repeat split, ' +
      'locations = address count grouped by city, ' +
      'all = returns all three groups.',
  })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType = CustomerType.ALL;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of cities to return (locations only)',
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

export enum TicketInsightType {
  SUMMARY = 'summary',
  OPEN_BY_PRIORITY = 'open-by-priority',
  RESPONSE_TIME = 'response-time',
  ALL = 'all',
}

export class TicketQueryDto {
  @ApiPropertyOptional({
    enum: TicketInsightType,
    default: TicketInsightType.ALL,
    description:
      'summary = ticket counts by status and priority, ' +
      'open-by-priority = open tickets sorted by priority, ' +
      'response-time = average first-admin-reply time, ' +
      'all = returns all three groups.',
  })
  @IsOptional()
  @IsEnum(TicketInsightType)
  type?: TicketInsightType = TicketInsightType.ALL;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export enum ReviewType {
  PENDING = 'pending',
  SUMMARY = 'summary',
  LOW_RATED = 'low-rated',
  ALL = 'all',
}

export class ReviewQueryDto {
  @ApiPropertyOptional({
    enum: ReviewType,
    default: ReviewType.ALL,
    description:
      'pending = reviews awaiting moderation, ' +
      'summary = total, average rating and distribution, ' +
      'low-rated = products with average rating below 3, ' +
      'all = returns all three groups.',
  })
  @IsOptional()
  @IsEnum(ReviewType)
  type?: ReviewType = ReviewType.ALL;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of rows to return (pending only)',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Minimum review count to flag a product (low-rated only)',
    example: 3,
    default: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minReviewCount?: number = 3;
}

export enum OrderInsightType {
  RECENT = 'recent',
  PENDING_ACTIONS = 'pending-actions',
  RETURNS_RATE = 'returns-rate',
  FULFILLMENT_TIME = 'fulfillment-time',
  ALL = 'all',
}

export class OrderInsightQueryDto {
  @ApiPropertyOptional({
    enum: OrderInsightType,
    default: OrderInsightType.ALL,
    description:
      'recent = most recent orders, ' +
      'pending-actions = orders stuck in PENDING/PROCESSING >24h, ' +
      'returns-rate = cancellation and return rate, ' +
      'fulfillment-time = average fulfillment time, ' +
      'all = returns all four groups.',
  })
  @IsOptional()
  @IsEnum(OrderInsightType)
  type?: OrderInsightType = OrderInsightType.ALL;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of rows to return (recent only)',
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

export enum InventoryType {
  LOW_STOCK = 'low-stock',
  OUT_OF_STOCK = 'out-of-stock',
  STOCK_VALUE = 'stock-value',
  NEVER_SOLD = 'never-sold',
  ALL = 'all',
}

export class InventoryQueryDto {
  @ApiPropertyOptional({
    enum: InventoryType,
    default: InventoryType.ALL,
    description:
      'low-stock = products at or below threshold, ' +
      'out-of-stock = products/variants with stock = 0, ' +
      'stock-value = capital locked in inventory, ' +
      'never-sold = products with zero orders older than N days, ' +
      'all = returns all four groups.',
  })
  @IsOptional()
  @IsEnum(InventoryType)
  type?: InventoryType = InventoryType.ALL;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Low-stock threshold (stock <= threshold)',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  threshold?: number = 5;

  @ApiPropertyOptional({
    description: 'Days since creation for never-sold filter',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staleDays?: number = 30;
}
