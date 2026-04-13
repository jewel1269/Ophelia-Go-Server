import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PurchaseOrderStatus } from '@prisma/client';

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({
    enum: ['DRAFT', 'ORDERED'],
    description: 'Only DRAFT → ORDERED transition is allowed here. Use /receive to mark PARTIAL/RECEIVED.',
  })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ example: '2026-05-10' })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional({ example: 'Delivery postponed by supplier' })
  @IsOptional()
  @IsString()
  notes?: string;
}
