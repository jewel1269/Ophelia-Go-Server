import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { StockMovementType } from '@prisma/client';

// The types an admin can use manually (PURCHASE is handled via PO flow, SALE via orders)
export enum ManualMovementType {
  INITIAL    = 'INITIAL',
  ADJUSTMENT = 'ADJUSTMENT',
  DAMAGE     = 'DAMAGE',
  RETURN     = 'RETURN',
  TRANSFER   = 'TRANSFER',
}

export class AdjustStockDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    example: 'uuid-of-variant',
    description: 'Required if adjusting a specific variant',
  })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({
    enum: ManualMovementType,
    example: ManualMovementType.ADJUSTMENT,
    description:
      'INITIAL = first-time setup, ADJUSTMENT = correction, DAMAGE = write-off, RETURN = customer return, TRANSFER = between locations',
  })
  @IsEnum(ManualMovementType)
  type: ManualMovementType;

  @ApiProperty({
    example: 10,
    description: 'Units to ADD. Use negative for ADJUSTMENT/DAMAGE/TRANSFER out.',
  })
  @IsInt()
  delta: number;

  @ApiPropertyOptional({ example: 'Physical count correction' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'Found extra units in back shelf' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'uuid-of-warehouse-location' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ example: 'REF-2026-001' })
  @IsOptional()
  @IsString()
  reference?: string;
}
