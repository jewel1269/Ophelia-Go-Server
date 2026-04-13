// ─────────────────────────────────────────────────────────────────────────────
// bkash.gateway.ts
//
// bKash Tokenized Checkout implementation.
// Credentials expected in PaymentGatewayConfig.credentials:
//   { app_key: string; app_secret: string; username: string; password: string }
//
// Docs: https://developer.bka.sh/docs/tokenized-checkout-overview
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import {
  IPaymentGateway,
  PaymentInitResult,
  PaymentPayload,
  PaymentVerifyResult,
} from '../payment-gateway.interface';

@Injectable()
export class BkashGateway implements IPaymentGateway {
  private readonly logger = new Logger(BkashGateway.name);

  private getBaseUrl(environment: string): string {
    return environment === 'LIVE'
      ? 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout'
      : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout';
  }

  /** Grant an id_token using app credentials */
  private async grantToken(
    baseUrl: string,
    credentials: Record<string, any>,
  ): Promise<string> {
    const { app_key, app_secret, username, password } = credentials;

    const res = await fetch(`${baseUrl}/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        username,
        password,
      },
      body: JSON.stringify({
        app_key,
        app_secret,
      }),
    });

    const data = (await res.json()) as Record<string, any>;

    if (!data.id_token) {
      throw new Error(`bKash token grant failed: ${JSON.stringify(data)}`);
    }

    return data.id_token as string;
  }

  async initiatePayment(
    payload: PaymentPayload,
    credentials: Record<string, any>,
    environment: string,
  ): Promise<PaymentInitResult> {
    const baseUrl = this.getBaseUrl(environment);

    try {
      const idToken = await this.grantToken(baseUrl, credentials);

      const res = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          authorization: idToken,
          'x-app-key': credentials.app_key as string,
        },
        body: JSON.stringify({
          mode: '0011', // Checkout URL mode
          payerReference: payload.customerPhone,
          callbackURL: payload.successUrl,
          amount: payload.amount.toFixed(2),
          currency: payload.currency,
          intent: 'sale',
          merchantInvoiceNumber: payload.orderId,
        }),
      });

      const data = (await res.json()) as Record<string, any>;
      this.logger.debug('bKash create payment response', data);

      if (data.statusCode !== '0000') {
        return {
          success: false,
          transactionId: payload.orderId,
          error: `${data.statusMessage as string} (${data.statusCode as string})`,
          gatewayResponse: data,
        };
      }

      return {
        success: true,
        paymentUrl: data.bkashURL as string,
        sessionKey: data.paymentID as string, // paymentID used in execute step
        transactionId: payload.orderId,
        gatewayResponse: data,
      };
    } catch (err) {
      this.logger.error('bKash initiatePayment error', err);
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
    const baseUrl = this.getBaseUrl(environment);

    // paymentID is returned by the bKash callback as a query param
    const paymentID = rawBody?.paymentID as string | undefined;

    if (!paymentID) {
      return {
        success: false,
        transactionId,
        amount: 0,
        status: 'FAILED',
        error: 'Missing paymentID in callback',
      };
    }

    try {
      const idToken = await this.grantToken(baseUrl, credentials);

      // Execute the payment
      const res = await fetch(`${baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          authorization: idToken,
          'x-app-key': credentials.app_key as string,
        },
        body: JSON.stringify({ paymentID }),
      });

      const data = (await res.json()) as Record<string, any>;
      this.logger.debug('bKash execute payment response', data);

      const paid = data.statusCode === '0000' && data.transactionStatus === 'Completed';

      return {
        success: paid,
        transactionId: (data.merchantInvoiceNumber as string) ?? transactionId,
        amount: parseFloat(data.amount as string) || 0,
        status: paid ? 'PAID' : 'FAILED',
        gatewayValId: data.trxID as string,
        gatewayResponse: data,
        error: paid ? undefined : `${data.statusMessage as string} (${data.statusCode as string})`,
      };
    } catch (err) {
      this.logger.error('bKash verifyPayment error', err);
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
