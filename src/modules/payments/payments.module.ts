import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/common/database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

// ── Core ──────────────────────────────────────────────────────────────────────
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

// ── Gateway config (admin CRUD) ───────────────────────────────────────────────
import { GatewayConfigController } from './config/gateway-config.controller';
import { GatewayConfigService } from './config/gateway-config.service';

// ── Strategy registry ─────────────────────────────────────────────────────────
import { PaymentRegistryService } from './gateways/payment-registry.service';

// ── Gateway handlers (add new ones here + register in PaymentRegistryService) ─
import { SslcommerzGateway } from './gateways/sslcommerz/sslcommerz.gateway';
import { BkashGateway } from './gateways/bkash/bkash.gateway';
import { AmarpayGateway } from './gateways/amarpay/amarpay.gateway';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    PaymentsController,
    GatewayConfigController,
  ],
  providers: [
    // guards
    JwtRefreshGuard,
    RolesGuard,
    // config layer
    GatewayConfigService,
    // gateway handlers
    SslcommerzGateway,
    BkashGateway,
    AmarpayGateway,
    // registry (depends on all three gateway handlers)
    PaymentRegistryService,
    // main service (depends on registry + config)
    PaymentsService,
  ],
  exports: [PaymentsService, GatewayConfigService],
})
export class PaymentsModule {}
