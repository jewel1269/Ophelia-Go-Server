import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsString()
  upazila: string;

  @IsOptional()
  @IsString()
  country?: string = 'Bangladesh';

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  @IsOptional()
  @IsString()
  label?: string = 'Home';
}
