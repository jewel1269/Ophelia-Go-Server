// ─────────────────────────────────────────────────────────────────────────────
// amarpay.gateway.ts
//
// AmarPay (aamarpay) payment gateway implementation.
// Credentials expected in PaymentGatewayConfig.credentials:
//   { store_id: string; signature_key: string }
//
// Docs: https://aamarpay.readme.io/reference/
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import {
  IPaymentGateway,
  PaymentInitResult,
  PaymentPayload,
  PaymentVerifyResult,
} from '../payment-gateway.interface';

@Injectable()
export class AmarpayGateway implements IPaymentGateway {
  private readonly logger = new Logger(AmarpayGateway.name);

  private getBaseUrl(environment: string): string {
    return environment === 'LIVE'
      ? 'https://secure.aamarpay.com'
      : 'https://sandbox.aamarpay.com';
  }

  async initiatePayment(
    payload: PaymentPayload,
    credentials: Record<string, any>,
    environment: string,
  ): Promise<PaymentInitResult> {
    const { store_id, signature_key } = credentials;
    const baseUrl = this.getBaseUrl(environment);

    const body = {
      store_id,
      signature_key,
      tran_id: payload.orderId,
      success_url: payload.successUrl,
      fail_url: payload.failUrl,
      cancel_url: payload.cancelUrl,
      amount: payload.amount.toFixed(2),
      currency: payload.currency,
      desc: `Order #${payload.orderId}`,
      cus_name: payload.customerName,
      cus_email: payload.customerEmail,
      cus_phone: payload.customerPhone,
      cus_add1: payload.customerAddress,
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      type: 'json',
    };

    try {
      const res = await fetch(`${baseUrl}/request.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as Record<string, any>;
      this.logger.debug('AmarPay initiate response', data);

      // AmarPay returns a payment URL string on success
      const paymentUrl = data[0] as string | undefined;

      if (!paymentUrl || typeof paymentUrl !== 'string') {
        return {
          success: false,
          transactionId: payload.orderId,
          error: 'AmarPay initiation failed — no payment URL returned',
          gatewayResponse: data,
        };
      }

      return {
        success: true,
        paymentUrl: paymentUrl.startsWith('http')
          ? paymentUrl
          : `${baseUrl}/${paymentUrl}`,
        transactionId: payload.orderId,
        gatewayResponse: data,
      };
    } catch (err) {
      this.logger.error('AmarPay initiatePayment error', err);
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
    const { store_id, signature_key } = credentials;
    const baseUrl = this.getBaseUrl(environment);

    // AmarPay sends mer_txnid in the IPN post body
    const merTxnId = (rawBody?.mer_txnid as string) ?? transactionId;

    try {
      const url =
        `${baseUrl}/api/v1/trxcheck/request.php` +
        `?store_id=${store_id}&signature_key=${signature_key}` +
        `&request_id=${merTxnId}&type=json`;

      const res = await fetch(url);
      const data = (await res.json()) as Record<string, any>;
      this.logger.debug('AmarPay verify response', data);

      const paid =
        data.pay_status === 'Successful' ||
        (data.status_code as string) === '2';

      return {
        success: paid,
        transactionId: merTxnId,
        amount: parseFloat(data.amount as string) || 0,
        status: paid ? 'PAID' : 'FAILED',
        gatewayValId: data.pg_txnid as string,
        gatewayResponse: data,
        error: paid ? undefined : `AmarPay status: ${data.pay_status as string}`,
      };
    } catch (err) {
      this.logger.error('AmarPay verifyPayment error', err);
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
