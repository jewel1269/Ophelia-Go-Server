import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReceiveItemDto {
  @ApiProperty({ example: 'uuid-of-purchase-order-item' })
  @IsUUID()
  purchaseOrderItemId: string;

  @ApiProperty({ example: 50, description: 'How many units actually arrived' })
  @IsNumber()
  @Min(1)
  receivedQty: number;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceiveItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];

  @ApiPropertyOptional({
    example: 'uuid-of-warehouse-location',
    description: 'Which warehouse location the goods arrived at',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ example: '2026-04-13', description: 'Actual received date (defaults to today)' })
  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @ApiPropertyOptional({ example: '3 units arrived damaged, excluded from count' })
  @IsOptional()
  @IsString()
  notes?: string;
}
