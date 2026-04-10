import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandsDto {
  @ApiProperty({ description: 'Brand display name', example: 'Ophelia' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'URL friendly unique slug', example: 'ophelia' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({
    description: 'Brand logo image URL',
    example: 'https://res.cloudinary.com/demo/image/upload/logo.png',
  })
  @IsString()
  @IsOptional()
  logo?: string;
}

export class UpdateBrands {
  @ApiPropertyOptional({
    description: 'Brand display name',
    example: 'Ophelia',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'URL friendly unique slug',
    example: 'ophelia',
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Brand logo image URL',
    example: 'https://res.cloudinary.com/demo/image/upload/logo.png',
  })
  @IsString()
  @IsOptional()
  logo?: string;
}
