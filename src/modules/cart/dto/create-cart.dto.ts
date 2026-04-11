import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CartItemDto {
  @ApiProperty({
    description: 'Product UUID',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'Optional product variant UUID',
    example: 'c5d2e3f4-5678-9abc-def0-123456789abc',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  variantId?: string | null;

  @ApiProperty({
    description: 'Quantity to add',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;
}

export class CreateCartWithItemsDto {
  @ApiPropertyOptional({
    description:
      'User UUID (injected automatically from the authenticated user, no need to provide manually)',
    example: 'd1e2f3a4-1234-4567-89ab-cdef01234567',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Items to add to the cart',
    type: [CartItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  @IsNotEmpty()
  items: CartItemDto[];
}
