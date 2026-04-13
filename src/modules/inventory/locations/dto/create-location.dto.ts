import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({ example: 'Main Warehouse' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'WH-MAIN',
    description: 'Short unique code used for references (e.g. WH-MAIN, SHELF-B4)',
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: '12 Tejgaon Industrial Area, Dhaka' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Dhaka' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Mark as default location. Automatically unsets previous default.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
