import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @ApiProperty({
    description: 'ID of the order to pay for',
    example: 'a1b2c3d4-...',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description:
      'Payment gateway name (must match an active PaymentGatewayConfig)',
    example: 'sslcommerz',
  })
  @IsString()
  @IsNotEmpty()
  method: string;
}
