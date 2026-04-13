// ─────────────────────────────────────────────────────────────────────────────
// sslcommerz.gateway.ts
//
// SSLCommerz payment gateway implementation.
// Credentials expected in PaymentGatewayConfig.credentials:
//   { store_id: string; store_passwd: string }
//
// Docs: https://developer.sslcommerz.com/doc/v4/
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import {
  IPaymentGateway,
  PaymentInitResult,
  PaymentPayload,
  PaymentVerifyResult,
} from '../payment-gateway.interface';

@Injectable()
export class SslcommerzGateway implements IPaymentGateway {
  private readonly logger = new Logger(SslcommerzGateway.name);

  private getBaseUrl(environment: string): string {
    return environment === 'LIVE'
      ? 'https://securepay.sslcommerz.com'
      : 'https://sandbox.sslcommerz.com';
  }

  async initiatePayment(
    payload: PaymentPayload,
    credentials: Record<string, any>,
    environment: string,
  ): Promise<PaymentInitResult> {
    const { store_id, store_passwd } = credentials;
    const baseUrl = this.getBaseUrl(environment);

    const params = new URLSearchParams({
      store_id,
      store_passwd,
      total_amount: payload.amount.toFixed(2),
      currency: payload.currency,
      tran_id: payload.orderId,
      success_url: payload.successUrl,
      fail_url: payload.failUrl,
      cancel_url: payload.cancelUrl,
      ipn_url: payload.successUrl, // re-use; override per-deploy if needed
      cus_name: payload.customerName,
      cus_email: payload.customerEmail,
      cus_phone: payload.customerPhone,
      cus_add1: payload.customerAddress,
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: `Order #${payload.orderId}`,
      product_category: 'General',
      product_profile: 'general',
    });

    try {
      const res = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = (await res.json()) as Record<string, any>;
      this.logger.debug('SSLCommerz initiate response', data);

      if (data.status !== 'SUCCESS') {
        return {
          success: false,
          transactionId: payload.orderId,
          error: data.failedreason ?? 'SSLCommerz initiation failed',
          gatewayResponse: data,
        };
      }

      return {
        success: true,
        paymentUrl: data.GatewayPageURL as string,
        sessionKey: data.sessionkey as string,
        transactionId: payload.orderId,
        gatewayResponse: data,
      };
    } catch (err) {
      this.logger.error('SSLCommerz initiatePayment error', err);
      return {
        success: false,
        transactionId: payload.orderId,
        error: (err as Error).message,
      };
    }
  }

  async verifyPayment(
    transactionId: string,
    credentials: Record<string, any>,
    environment: string,
    rawBody?: Record<string, any>,
  ): Promise<PaymentVerifyResult> {
    const { store_id, store_passwd } = credentials;
    const baseUrl = this.getBaseUrl(environment);

    // val_id is forwarded in the IPN callback body
    const valId = rawBody?.val_id as string | undefined;

    if (!valId) {
      return {
        success: false,
        transactionId,
        amount: 0,
        status: 'FAILED',
        error: 'Missing val_id in callback body',
      };
    }

    try {
      const url =
        `${baseUrl}/validator/api/validationserverAPI.php` +
        `?val_id=${valId}&store_id=${store_id}&store_passwd=${store_passwd}&format=json`;

      const res = await fetch(url);
      const data = (await res.json()) as Record<string, any>;
      this.logger.debug('SSLCommerz verify response', data);

      const paid =
        data.status === 'VALID' || data.status === 'VALIDATED';

      return {
        success: paid,
        transactionId: (data.tran_id as string) ?? transactionId,
        amount: parseFloat(data.amount as string) || 0,
        status: paid ? 'PAID' : 'FAILED',
        gatewayValId: data.val_id as string,
        gatewayResponse: data,
        error: paid ? undefined : `SSLCommerz status: ${data.status as string}`,
      };
    } catch (err) {
      this.logger.error('SSLCommerz verifyPayment error', err);
      return {
        success: false,
        transactionId,
        amount: 0,
        status: 'FAILED',
        error: (err as Error).message,
      };
    }
  }
}
