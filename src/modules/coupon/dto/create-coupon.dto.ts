import { DiscountType } from '@prisma/client';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  code!: string;

  @IsEnum(DiscountType)
  type!: DiscountType;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsNumber()
  minOrderVal?: number;

  @IsOptional()
  @IsNumber()
  maxDiscount?: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limitPerUser?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
