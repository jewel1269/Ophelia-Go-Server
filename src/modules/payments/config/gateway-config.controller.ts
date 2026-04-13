// ─────────────────────────────────────────────────────────────────────────────
// gateway-config.controller.ts
//
// Admin endpoints for managing payment gateway configurations.
// All write endpoints are restricted to ADMIN / SUPER_ADMIN.
// GET /active is public so the checkout page can list available methods.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { GatewayConfigService } from './gateway-config.service';
import { CreateGatewayConfigDto } from './dto/create-gateway-config.dto';
import { UpdateGatewayConfigDto } from './dto/update-gateway-config.dto';

@ApiTags('Payment Gateway Config')
@Controller('payment-gateways')
export class GatewayConfigController {
  constructor(private readonly gatewayConfigService: GatewayConfigService) {}

  // ── Admin endpoints ────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new payment gateway configuration' })
  @ApiBody({ type: CreateGatewayConfigDto })
  @ApiResponse({ status: 201, description: 'Gateway config created' })
  create(@Body() dto: CreateGatewayConfigDto) {
    return this.gatewayConfigService.create(dto);
  }

  @Get()
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all gateway configurations (credentials masked)' })
  findAll() {
    return this.gatewayConfigService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a single gateway configuration by ID' })
  @ApiParam({ name: 'id', description: 'Gateway config UUID' })
  findOne(@Param('id') id: string) {
    return this.gatewayConfigService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update gateway configuration' })
  @ApiParam({ name: 'id', description: 'Gateway config UUID' })
  @ApiBody({ type: UpdateGatewayConfigDto })
  update(@Param('id') id: string, @Body() dto: UpdateGatewayConfigDto) {
    return this.gatewayConfigService.update(id, dto);
  }

  @Patch(':id/enable')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Enable a payment gateway' })
  @ApiParam({ name: 'id', description: 'Gateway config UUID' })
  enable(@Param('id') id: string) {
    return this.gatewayConfigService.toggleActive(id, true);
  }

  @Patch(':id/disable')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Disable a payment gateway' })
  @ApiParam({ name: 'id', description: 'Gateway config UUID' })
  disable(@Param('id') id: string) {
    return this.gatewayConfigService.toggleActive(id, false);
  }

  @Delete(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a gateway configuration (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Gateway config UUID' })
  remove(@Param('id') id: string) {
    return this.gatewayConfigService.remove(id);
  }

  // ── Public endpoint ────────────────────────────────────────────────────────

  @Get('public/active')
  @ApiOperation({
    summary: 'List active payment methods (no credentials exposed)',
    description: 'Used by the checkout page to show available payment options.',
  })
  findActive() {
    return this.gatewayConfigService.findAllActive();
  }
}
