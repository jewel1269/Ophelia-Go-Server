// create-product-variant.dto.ts
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsObject,
  IsNotEmpty,
} from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsInt()
  @IsOptional()
  stock?: number = 0;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, any> | null = null;
}
