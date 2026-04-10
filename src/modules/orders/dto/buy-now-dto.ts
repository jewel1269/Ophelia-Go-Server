import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { PaymentType } from './create-order.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BuyNowDto {
  @ApiProperty({
    description: 'Product UUID',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    description: 'Optional product variant UUID',
    example: 'c5d2e3f4-5678-9abc-def0-123456789abc',
  })
  @IsUUID()
  @IsOptional()
  variantId?: string | null;

  @ApiProperty({ description: 'Quantity to buy', example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Shipping cost', example: 80 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentType,
    example: PaymentType.COD,
  })
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @ApiProperty({
    description: 'Shipping address UUID of the customer',
    example: '4b2c9d1e-1f44-42db-9ecb-1234567890cd',
  })
  @IsUUID()
  addressId: string;
}
