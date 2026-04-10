import { IsString, IsOptional, IsUUID, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category display name', example: 'Clothing' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'URL friendly unique slug',
    example: 'clothing',
  })
  @IsString()
  slug: string;

  @ApiPropertyOptional({
    description: 'Category image URL',
    example: 'https://res.cloudinary.com/demo/image/upload/clothing.jpg',
  })
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({
    description: 'Background image URL shown on the category banner',
    example: 'https://res.cloudinary.com/demo/image/upload/bg.jpg',
  })
  @IsOptional()
  @IsUrl()
  backgroundImage?: string;

  @ApiPropertyOptional({
    description: 'UUID of the parent category (if nested)',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
