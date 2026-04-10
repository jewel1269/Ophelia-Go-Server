import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBannerDto {
  @ApiProperty({
    description: 'Banner title',
    example: 'Summer Sale 2024',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Array of banner image URLs',
    type: [String],
    example: [
      'https://res.cloudinary.com/demo/image/upload/banner1.jpg',
      'https://res.cloudinary.com/demo/image/upload/banner2.jpg',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @ApiPropertyOptional({
    description: 'Short announcement text shown with the banner',
    example: 'Up to 50% off on selected items!',
  })
  @IsString()
  @IsOptional()
  announcement?: string;

  @ApiPropertyOptional({
    description: 'Short description shown below the title',
    example: 'Refresh your wardrobe with our summer collection.',
  })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional({
    description: 'Link the banner redirects to on click',
    example: '/shop?category=summer',
  })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional({
    description: 'Whether the banner is active / visible',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Display order position',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({
    description: 'Banner type (e.g. hero, strip, popup)',
    example: 'hero',
  })
  @IsString()
  @IsOptional()
  type?: string;
}
