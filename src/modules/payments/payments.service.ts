// ─────────────────────────────────────────────────────────────────────────────
// payments.service.ts
//
// Orchestrates the full payment lifecycle:
//   1. initiatePayment  — validate order → load config → call gateway → persist
//   2. handleCallback   — verify with gateway → update Payment + Order
//   3. findAll / findOne — query helpers
// ─────────────────────────────────────────────────────────────────────────────

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LogSource, LogType, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { GatewayConfigService } from './config/gateway-config.service';
import { PaymentRegistryService } from './gateways/payment-registry.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayConfig: GatewayConfigService,
    private readonly registry: PaymentRegistryService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // ── Initiate ───────────────────────────────────────────────────────────────

  /**
   * Entry point for starting a payment.
   * Returns a paymentUrl the frontend redirects the customer to.
   */
  async initiatePayment(dto: InitiatePaymentDto, baseUrl: string) {
    const { orderId, method } = dto;

    // 1. Load order with customer info
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, payment: true },
    });
    if (!order) throw new NotFoundException(`Order "${orderId}" not found`);

    if (order.payment?.status === PaymentStatus.PAID) {
      throw new BadRequestException('This order has already been paid');
    }

    // 2. Load active gateway config (throws if inactive / missing)
    const config = await this.gatewayConfig.findCredentials(method);

    // 3. Resolve gateway handler
    const gateway = this.registry.resolve(method);

    // 4. Build callback URLs
    const callbackBase = `${baseUrl}/payments/callback/${method.toLowerCase()}`;

    // 5. Call the gateway
    const result = await gateway.initiatePayment(
      {
        orderId,
        amount: order.totalAmount,
        currency: 'BDT',
        customerName: order.user.name ?? 'Customer',
        customerEmail: order.user.email,
        customerPhone: order.user.phone ?? '01700000000',
        customerAddress: this.extractAddress(order.shippingAddress),
        successUrl: `${callbackBase}/success`,
        failUrl: `${callbackBase}/fail`,
        cancelUrl: `${callbackBase}/cancel`,
      },
      config.credentials as Record<string, any>,
      config.environment,
    );

    if (!result.success) {
      this.logger.warn(
        `Gateway initiation failed [${method}]: ${result.error}`,
      );
      throw new BadRequestException(
        result.error ?? 'Payment initiation failed',
      );
    }

    // 6. Upsert a PENDING payment record
    await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        method: this.mapMethod(method),
        status: PaymentStatus.PENDING,
        amount: order.totalAmount,
        currency: 'BDT',
        transactionId: orderId,
        gatewayResponse: result.gatewayResponse ?? {},
      },
      update: {
        status: PaymentStatus.PENDING,
        gatewayResponse: result.gatewayResponse ?? {},
      },
    });

    void this.activityLogs.log({
      action: 'PAYMENT_INITIATED',
      message: `Payment initiated via ${method} for order ${orderId} — ৳${order.totalAmount}`,
      type: LogType.INFO,
      source: LogSource.PAYMENT,
      userId: order.user.id,
      entityId: orderId,
      metadata: { method, amount: order.totalAmount },
    });

    return {
      paymentUrl: result.paymentUrl,
      sessionKey: result.sessionKey,
      transactionId: result.transactionId,
    };
  }

  // ── Callback / IPN ─────────────────────────────────────────────────────────

  /**
   * Called by gateway callbacks (IPN, redirect) after customer pays.
   * Verifies the payment, then updates Payment + Order status.
   */
  async handleCallback(
    gatewayName: string,
    rawBody: Record<string, any>,
  ): Promise<{ status: string; transactionId: string }> {
    // Derive the transactionId (= orderId we sent as tran_id)
    const transactionId =
      (rawBody.tran_id as string | undefined) ?? // SSLCommerz
      (rawBody.merchantInvoiceNumber as string | undefined) ?? // bKash
      (rawBody.mer_txnid as string | undefined) ?? // AmarPay
      '';

    if (!transactionId) {
      throw new BadRequestException(
        'Cannot determine transaction ID from callback body',
      );
    }

    // Load config (no activeness check here — IPN can arrive after disabling)
    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { name: gatewayName.toLowerCase() },
    });
    if (!config) {
      throw new NotFoundException(`Unknown gateway "${gatewayName}"`);
    }

    const gateway = this.registry.resolve(gatewayName);

    const verification = await gateway.verifyPayment(
      transactionId,
      config.credentials as Record<string, any>,
      config.environment,
      rawBody,
    );

    this.logger.log(
      `[${gatewayName}] verify result — ` +
        `txn: ${transactionId}, status: ${verification.status}`,
    );

    // Update payment record
    const paymentStatus =
      verification.status === 'PAID'
        ? PaymentStatus.PAID
        : PaymentStatus.FAILED;

    await this.prisma.payment.upsert({
      where: { orderId: transactionId },
      create: {
        orderId: transactionId,
        method: this.mapMethod(gatewayName),
        status: paymentStatus,
        amount: verification.amount,
        currency: 'BDT',
        transactionId,
        gatewayValId: verification.gatewayValId,
        gatewayResponse: verification.gatewayResponse ?? {},
        paidAt: paymentStatus === PaymentStatus.PAID ? new Date() : null,
      },
      update: {
        status: paymentStatus,
        gatewayValId: verification.gatewayValId,
        gatewayResponse: verification.gatewayResponse ?? {},
        paidAt: paymentStatus === PaymentStatus.PAID ? new Date() : null,
      },
    });

    // Advance order status on successful payment
    if (paymentStatus === PaymentStatus.PAID) {
      await this.prisma.order.update({
        where: { id: transactionId },
        data: { status: OrderStatus.PROCESSING },
      });
      void this.activityLogs.log({
        action: 'PAYMENT_SUCCESS',
        message: `Payment confirmed via ${gatewayName} for order ${transactionId} — ৳${verification.amount}`,
        type: LogType.INFO,
        source: LogSource.PAYMENT,
        entityId: transactionId,
        metadata: { gateway: gatewayName, amount: verification.amount, valId: verification.gatewayValId },
      });
    } else {
      void this.activityLogs.log({
        action: 'PAYMENT_FAILED',
        message: `Payment failed via ${gatewayName} for order ${transactionId}`,
        type: LogType.WARNING,
        source: LogSource.PAYMENT,
        entityId: transactionId,
        metadata: { gateway: gatewayName, error: verification.error },
      });
    }

    return { status: verification.status, transactionId };
  }

  // ── Query ──────────────────────────────────────────────────────────────────

  async findAll(query: { page?: number; limit?: number; status?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (query.status) where.status = query.status;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderNumber: true, userId: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException(`Payment "${id}" not found`);
    return payment;
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private mapMethod(gatewayName: string): PaymentMethod {
    const map: Record<string, PaymentMethod> = {
      sslcommerz: PaymentMethod.SSLCOMMERZ,
      bkash: PaymentMethod.BKASH,
      amarpay: PaymentMethod.AMARPAY,
      nagad: PaymentMethod.NAGAD,
      stripe: PaymentMethod.STRIPE,
      cod: PaymentMethod.COD,
    };
    return map[gatewayName.toLowerCase()] ?? PaymentMethod.SSLCOMMERZ;
  }

  private extractAddress(shippingAddress: unknown): string {
    if (!shippingAddress || typeof shippingAddress !== 'object') return 'N/A';
    const addr = shippingAddress as Record<string, string>;
    return [addr.street, addr.city, addr.state, addr.country]
      .filter(Boolean)
      .join(', ');
  }
}
