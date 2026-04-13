// ─────────────────────────────────────────────────────────────────────────────
// payments.controller.ts
//
// Routes:
//   POST   /payments/initiate                 — start a payment (authenticated)
//   POST   /payments/callback/:gateway/success — gateway success / IPN callback
//   POST   /payments/callback/:gateway/fail    — gateway failure callback
//   GET    /payments                           — list all payments (ADMIN)
//   GET    /payments/:id                       — single payment (ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
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
import type { Request } from 'express';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── Customer endpoints ─────────────────────────────────────────────────────

  @Post('initiate')
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({
    summary: 'Initiate a payment for an order',
    description:
      'Returns a paymentUrl. The frontend redirects the customer to that URL.',
  })
  @ApiBody({ type: InitiatePaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Returns { paymentUrl, transactionId }',
  })
  initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @Req() req: Request,
    @CurrentUser() _user: any,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/v1`;
    return this.paymentsService.initiatePayment(dto, baseUrl);
  }

  // ── Gateway callbacks (no auth — called by payment gateways) ──────────────

  @Post('callback/:gateway/success')
  @ApiOperation({
    summary: 'Gateway success / IPN callback',
    description: 'Called by the payment gateway after a successful payment.',
  })
  @ApiParam({ name: 'gateway', example: 'sslcommerz' })
  handleSuccess(
    @Param('gateway') gateway: string,
    @Body() body: Record<string, any>,
  ) {
    return this.paymentsService.handleCallback(gateway, body);
  }

  @Post('callback/:gateway/fail')
  @ApiOperation({ summary: 'Gateway failure callback' })
  @ApiParam({ name: 'gateway', example: 'sslcommerz' })
  handleFail(
    @Param('gateway') gateway: string,
    @Body() body: Record<string, any>,
  ) {
    return this.paymentsService.handleCallback(gateway, body);
  }

  // ── Admin endpoints ────────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all payment records (ADMIN)' })
  findAll(@Query() query: { page?: number; limit?: number; status?: string }) {
    return this.paymentsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a payment record by ID (ADMIN)' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }
}
