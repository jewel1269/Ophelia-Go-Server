import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiPropertyOptional({
    description: 'Review comment',
    example: 'Great product, fits perfectly and very comfortable!',
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({
    description: 'Array of image URLs attached to the review',
    type: [String],
    example: [
      'https://res.cloudinary.com/demo/image/upload/review1.jpg',
      'https://res.cloudinary.com/demo/image/upload/review2.jpg',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @ApiProperty({
    description: 'Rating (typically 1 - 5)',
    example: 5,
  })
  @IsNumber()
  @IsNotEmpty()
  rating: number;
}
