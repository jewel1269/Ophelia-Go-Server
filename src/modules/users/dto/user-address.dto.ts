import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ description: 'Recipient full name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+8801712345678',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Street address',
    example: '123 Main Street, Apt 4B',
  })
  @IsString()
  street: string;

  @ApiProperty({ description: 'City name', example: 'Dhaka' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ description: 'State / Division', example: 'Dhaka' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: 'Upazila / Sub-district', example: 'Dhanmondi' })
  @IsString()
  upazila: string;

  @ApiPropertyOptional({
    description: 'Country name',
    example: 'Bangladesh',
    default: 'Bangladesh',
  })
  @IsOptional()
  @IsString()
  country?: string = 'Bangladesh';

  @ApiPropertyOptional({
    description: 'Mark as default address',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  @ApiPropertyOptional({
    description: 'Address label (Home / Office / Other)',
    example: 'Home',
    default: 'Home',
  })
  @IsOptional()
  @IsString()
  label?: string = 'Home';
}
