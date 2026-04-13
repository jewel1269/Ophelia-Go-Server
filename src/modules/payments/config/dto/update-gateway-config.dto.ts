import { PartialType } from '@nestjs/swagger';
import { CreateGatewayConfigDto } from './create-gateway-config.dto';

export class UpdateGatewayConfigDto extends PartialType(
  CreateGatewayConfigDto,
) {}
