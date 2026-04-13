// ─────────────────────────────────────────────────────────────────────────────
// payment-registry.service.ts
//
// Central dispatcher.  Maps gateway names → handler instances.
// To add a new gateway:
//   1. Implement IPaymentGateway in a new file under gateways/
//   2. Inject it here and call register() in the constructor
//   3. Add it to the NestJS providers list in payments.module.ts
// Nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

import { BadRequestException, Injectable } from '@nestjs/common';
import { IPaymentGateway } from './payment-gateway.interface';
import { SslcommerzGateway } from './sslcommerz/sslcommerz.gateway';
import { BkashGateway } from './bkash/bkash.gateway';
import { AmarpayGateway } from './amarpay/amarpay.gateway';

@Injectable()
export class PaymentRegistryService {
  private readonly gateways = new Map<string, IPaymentGateway>();

  constructor(
    private readonly sslcommerz: SslcommerzGateway,
    private readonly bkash: BkashGateway,
    private readonly amarpay: AmarpayGateway,
  ) {
    this.register('sslcommerz', this.sslcommerz);
    this.register('bkash', this.bkash);
    this.register('amarpay', this.amarpay);
  }

  /** Register a new gateway at runtime (useful for plugins / feature flags) */
  register(name: string, gateway: IPaymentGateway): void {
    this.gateways.set(name.toLowerCase(), gateway);
  }

  /**
   * Resolve the correct gateway handler by name.
   * Throws 400 if the gateway is unknown (not just inactive — activeness is
   * checked at the service layer against the DB config).
   */
  resolve(name: string): IPaymentGateway {
    const gateway = this.gateways.get(name.toLowerCase());
    if (!gateway) {
      throw new BadRequestException(
        `Payment gateway "${name}" is not supported. ` +
          `Supported: ${[...this.gateways.keys()].join(', ')}`,
      );
    }
    return gateway;
  }

  /** List all registered gateway names */
  listRegistered(): string[] {
    return [...this.gateways.keys()];
  }
}
