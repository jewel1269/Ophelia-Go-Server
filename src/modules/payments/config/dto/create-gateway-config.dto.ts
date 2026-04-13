import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GatewayEnvironment } from '@prisma/client';

export class CreateGatewayConfigDto {
  @ApiProperty({
    description: 'Unique gateway identifier (lowercase slug)',
    example: 'sslcommerz',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Human-readable gateway name shown in the UI',
    example: 'SSLCommerz',
  })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiPropertyOptional({
    description: 'Whether the gateway is available at checkout',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description:
      'Gateway credentials as a JSON object. ' +
      'SSLCommerz: { store_id, store_passwd }. ' +
      'bKash: { app_key, app_secret, username, password }. ' +
      'AmarPay: { store_id, signature_key }.',
    example: { store_id: 'testbox', store_passwd: 'qwerty' },
  })
  @IsObject()
  credentials: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Target environment',
    enum: GatewayEnvironment,
    example: GatewayEnvironment.SANDBOX,
  })
  @IsEnum(GatewayEnvironment)
  @IsOptional()
  environment?: GatewayEnvironment;
}
