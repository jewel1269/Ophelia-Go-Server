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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product display name',
    example: 'Classic Cotton T-Shirt',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'URL friendly unique slug for the product',
    example: 'classic-cotton-t-shirt',
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    description: 'Detailed product description',
    example:
      'A premium quality 100% cotton t-shirt with a classic crew neck design.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Short description for listings',
    example: 'Premium cotton crew-neck tee.',
  })
  @IsString()
  @IsOptional()
  shortDesc?: string;

  @ApiProperty({ description: 'Base price in BDT', example: 1499 })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({
    description: 'Discounted price in BDT',
    example: 1199,
  })
  @IsNumber()
  @IsOptional()
  discountPrice?: number;

  @ApiPropertyOptional({
    description: 'Total stock quantity',
    example: 100,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  stock?: number = 0;

  @ApiProperty({
    description: 'Unique stock keeping unit',
    example: 'TSHIRT-CLASSIC-001',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({
    description: 'Array of product image URLs',
    example: [
      'https://res.cloudinary.com/demo/image/upload/p1.jpg',
      'https://res.cloudinary.com/demo/image/upload/p2.jpg',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  images: string[];

  @ApiPropertyOptional({
    description: 'Thumbnail image URL',
    example: 'https://res.cloudinary.com/demo/image/upload/thumb.jpg',
  })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({
    description: 'UUID of the product category',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'UUID of the product brand',
    example: 'b4c9d2f3-2345-5678-9abc-def012345678',
  })
  @IsUUID()
  @IsOptional()
  brandId?: string;

  @ApiPropertyOptional({
    description: 'Whether the product is featured on the storefront',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean = false;

  @ApiPropertyOptional({
    description: 'Whether the product is archived (hidden)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean = false;

  @ApiPropertyOptional({
    description: 'Tags for filtering/searching',
    example: ['cotton', 'summer', 'casual'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Product variants (size, color, etc.)',
    type: [CreateProductVariantDto],
  })
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
