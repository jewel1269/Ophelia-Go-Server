import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsObject,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductVariantDto {
  @ApiProperty({ description: 'Variant name', example: 'Red - Large' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Unique SKU for the variant',
    example: 'TSHIRT-RED-L-001',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional({
    description: 'Optional price override for the variant',
    example: 1499,
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    description: 'Stock quantity for this variant',
    example: 25,
    default: 0,
  })
  @IsInt()
  @IsOptional()
  stock: number = 0;

  @ApiProperty({
    description: 'Arbitrary attributes (color, size, etc.)',
    example: { color: 'red', size: 'L' },
  })
  @IsObject()
  @IsNotEmpty()
  attributes: {
    color?: string;
    size?: string;
    [key: string]: any;
  };
}
