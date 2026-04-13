import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Dhaka Wholesale Ltd.' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Rahim Uddin' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ example: 'rahim@dhakawholesale.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '01711-000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '12 Tejgaon Industrial Area' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Dhaka' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Bangladesh', default: 'Bangladesh' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: 7,
    description: 'Average days from order placement to delivery',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  leadTimeDays?: number;

  @ApiPropertyOptional({ example: 'Preferred supplier for electronics' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
