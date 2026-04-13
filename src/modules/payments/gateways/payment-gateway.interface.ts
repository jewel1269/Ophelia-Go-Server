// ─────────────────────────────────────────────────────────────────────────────
// payment-gateway.interface.ts
// Central strategy contract that every gateway must implement.
// Add a new gateway by implementing IPaymentGateway and registering it in
// PaymentRegistryService — zero changes to anything else.
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentPayload {
  /** Internal order ID (used as tran_id / reference) */
  orderId: string;
  /** Amount in smallest unit (BDT taka as float, e.g. 1500.00) */
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  /** Where the gateway POSTs / redirects after success */
  successUrl: string;
  /** Where the gateway POSTs / redirects after failure */
  failUrl: string;
  /** Where the gateway POSTs / redirects after cancellation */
  cancelUrl: string;
  /** Arbitrary extra data forwarded to the gateway */
  metadata?: Record<string, any>;
}

export interface PaymentInitResult {
  success: boolean;
  /** URL the frontend must redirect the customer to */
  paymentUrl?: string;
  /** Gateway session / token (gateway-specific) */
  sessionKey?: string;
  /** Transaction ID used to track this payment */
  transactionId: string;
  /** Raw gateway response (stored for audit) */
  gatewayResponse?: Record<string, any>;
  error?: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  transactionId: string;
  amount: number;
  status: 'PAID' | 'FAILED' | 'PENDING';
  /** Validation ID returned by the gateway on success */
  gatewayValId?: string;
  /** Raw gateway response (stored for audit) */
  gatewayResponse?: Record<string, any>;
  error?: string;
}

export interface IPaymentGateway {
  /**
   * Start a payment session and return the redirect URL.
   * @param payload   Normalised order/customer data
   * @param credentials  Decrypted gateway credentials from DB
   * @param environment  "SANDBOX" | "LIVE"
   */
  initiatePayment(
    payload: PaymentPayload,
    credentials: Record<string, any>,
    environment: string,
  ): Promise<PaymentInitResult>;

  /**
   * Verify a payment after the gateway posts back.
   * @param transactionId  The tran_id / payment_id we generated
   * @param credentials    Decrypted gateway credentials from DB
   * @param environment    "SANDBOX" | "LIVE"
   * @param rawBody        The raw IPN / callback body from the gateway
   */
  verifyPayment(
    transactionId: string,
    credentials: Record<string, any>,
    environment: string,
    rawBody?: Record<string, any>,
  ): Promise<PaymentVerifyResult>;
}
