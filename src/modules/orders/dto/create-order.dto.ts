import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  Min,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentType {
  COD = 'COD',
  ONLINE = 'ONLINE',
}

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'Product UUID',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'Optional product variant UUID',
    example: 'c5d2e3f4-5678-9abc-def0-123456789abc',
  })
  @IsUUID()
  @IsOptional()
  variantId?: string;

  @ApiProperty({
    description: 'Product name at time of ordering',
    example: 'Classic Cotton T-Shirt',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Unit price', example: 1199 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Quantity ordered', example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Product image URL',
    example: 'https://res.cloudinary.com/demo/image/upload/p1.jpg',
  })
  @IsUrl()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({
    description: 'Product slug',
    example: 'classic-cotton-t-shirt',
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Discounted price', example: 1199 })
  @IsNumber()
  @IsOptional()
  discountPrice?: number;

  @ApiPropertyOptional({ description: 'Original price', example: 1499 })
  @IsNumber()
  @IsOptional()
  originalPrice?: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'List of items in the order',
    type: [CreateOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ description: 'Total amount of the order', example: 2398 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Shipping cost', example: 80 })
  @IsNumber()
  @Min(0)
  @IsOptional()
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
  @IsNotEmpty()
  addressId: string;

  @ApiPropertyOptional({ description: 'Coupon code to apply', example: 'SAVE10' })
  @IsString()
  @IsOptional()
  couponCode?: string;
}
