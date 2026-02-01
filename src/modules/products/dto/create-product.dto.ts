import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
  IsUUID,
} from 'class-validator';
import { CreateProductVariantDto } from './create-product-variant.dto';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  shortDesc?: string;

  @IsNumber()
  price: number;

  @IsNumber()
  @IsOptional()
  discountPrice?: number;

  @IsNumber()
  @IsOptional()
  stock?: number = 0;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  images: string[];

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  @IsOptional()
  brandId?: string;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean = false;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  @IsOptional()
  variants?: CreateProductVariantDto[];
}

export interface ProductAttributes {
  size?: string;
  color?: string;
  [key: string]: any;
}
