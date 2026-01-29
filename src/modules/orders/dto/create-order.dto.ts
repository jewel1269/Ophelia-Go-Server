import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';
import { CreatePaymentDto } from 'src/modules/payments/dto/create-payment.dto';

export class CreateOrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsUUID()
  @IsOptional()
  variantId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  orderNumber: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsNumber()
  @Min(0)
  subTotal: number;

  @IsNumber()
  @Min(0)
  shippingCost: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number = 0;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsObject()
  @IsNotEmpty()
  shippingAddress: Record<string, any>;

  @IsObject()
  @IsOptional()
  billingAddress?: Record<string, any>;

  @IsString()
  @IsOptional()
  couponId?: string;

  @Type(() => CreatePaymentDto)
  @ValidateNested()
  payment: CreatePaymentDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  orderItems: CreateOrderItemDto[];
}
