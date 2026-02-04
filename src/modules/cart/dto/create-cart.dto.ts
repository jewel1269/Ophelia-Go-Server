import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateCartDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
  @IsString()
  @IsNotEmpty()
  productId: string;
  @IsString()
  @IsNotEmpty()
  variantId: string;
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
