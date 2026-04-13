import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from 'src/common/database/prisma.service';
import { GatewayConfigService } from './config/gateway-config.service';
import { PaymentRegistryService } from './gateways/payment-registry.service';

const mockPrisma = { order: {}, payment: {}, paymentGatewayConfig: {} };
const mockGatewayConfig = { findCredentials: jest.fn() };
const mockRegistry = { resolve: jest.fn() };

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GatewayConfigService, useValue: mockGatewayConfig },
        { provide: PaymentRegistryService, useValue: mockRegistry },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
