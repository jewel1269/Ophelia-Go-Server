import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { PaymentType } from './create-order.dto';

export class BuyNowDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  @IsOptional()
  variantId?: string | null;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost: number;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsUUID()
  addressId: string;
}
