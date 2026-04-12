import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class PurchaseOrderItemDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ example: 'uuid-of-variant', description: 'Leave empty for base product' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ example: 100, description: 'Number of units ordered' })
  @IsNumber()
  @Min(1)
  orderedQty: number;

  @ApiProperty({ example: 250.0, description: 'Cost price per unit in BDT' })
  @IsNumber()
  @IsPositive()
  costPrice: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: 'uuid-of-supplier' })
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional({
    example: '2026-05-01',
    description: 'Expected delivery date',
  })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional({ example: 'Urgent restock for Eid season' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}
