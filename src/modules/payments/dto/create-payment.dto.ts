import { PaymentMethod, PaymentStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: 'CARD',
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  method: PaymentMethod;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: 'PAID',
  })
  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  status: PaymentStatus;

  @ApiProperty({
    description: 'Payment amount',
    example: 2398,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: 'Transaction id from the payment gateway',
    example: 'txn_1HZk2eJL3l4D2o5K',
  })
  @IsString()
  @IsOptional()
  transactionId: string;

  @ApiPropertyOptional({
    description: 'Card type (Visa, MasterCard, etc.)',
    example: 'Visa',
  })
  @IsString()
  @IsOptional()
  cardType?: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'BDT',
  })
  @IsString()
  @IsOptional()
  currency?: string;
}
