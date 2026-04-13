// ─────────────────────────────────────────────────────────────────────────────
// gateway-config.service.ts
//
// Admin service for managing PaymentGatewayConfig records.
// Credentials are stored as-is in the JSON column (DB-level encryption is
// recommended for production via pgcrypto or an external KMS).
// When returning configs to API consumers, sensitive credential keys are masked.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateGatewayConfigDto } from './dto/create-gateway-config.dto';
import { UpdateGatewayConfigDto } from './dto/update-gateway-config.dto';

/** Keys whose values are masked before returning to API consumers */
const SENSITIVE_KEYS = [
  'secret',
  'password',
  'passwd',
  'key',
  'token',
  'private',
  'api_key',
];

function maskCredentials(
  credentials: Record<string, any>,
): Record<string, any> {
  const masked: Record<string, any> = {};
  for (const [k, v] of Object.entries(credentials)) {
    const lower = k.toLowerCase();
    masked[k] = SENSITIVE_KEYS.some((s) => lower.includes(s))
      ? '**********'
      : v;
  }
  return masked;
}

@Injectable()
export class GatewayConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGatewayConfigDto) {
    const exists = await this.prisma.paymentGatewayConfig.findUnique({
      where: { name: dto.name.toLowerCase() },
    });
    if (exists) {
      throw new BadRequestException(
        `Gateway config for "${dto.name}" already exists. Use PATCH to update.`,
      );
    }

    this.validateCredentials(dto.name, dto.credentials);

    const config = await this.prisma.paymentGatewayConfig.create({
      data: {
        ...dto,
        name: dto.name.toLowerCase(),
        isActive: dto.isActive ?? false,
      },
    });

    return { ...config, credentials: maskCredentials(config.credentials as Record<string, any>) };
  }

  async findAll() {
    const configs = await this.prisma.paymentGatewayConfig.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return configs.map((c) => ({
      ...c,
      credentials: maskCredentials(c.credentials as Record<string, any>),
    }));
  }

  async findAllActive() {
    const configs = await this.prisma.paymentGatewayConfig.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return configs.map((c) => ({
      id: c.id,
      name: c.name,
      displayName: c.displayName,
      environment: c.environment,
    }));
  }

  async findOne(id: string) {
    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { id },
    });
    if (!config) throw new NotFoundException(`Gateway config "${id}" not found`);
    return {
      ...config,
      credentials: maskCredentials(config.credentials as Record<string, any>),
    };
  }

  /** Internal use only — returns raw credentials for gateway calls */
  async findCredentials(name: string) {
    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { name: name.toLowerCase() },
    });
    if (!config) {
      throw new NotFoundException(`No configuration found for gateway "${name}"`);
    }
    if (!config.isActive) {
      throw new BadRequestException(`Gateway "${name}" is currently disabled`);
    }
    return config;
  }

  async update(id: string, dto: UpdateGatewayConfigDto) {
    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { id },
    });
    if (!config) throw new NotFoundException(`Gateway config "${id}" not found`);

    if (dto.credentials) {
      this.validateCredentials(
        dto.name ?? config.name,
        dto.credentials,
      );
    }

    const updated = await this.prisma.paymentGatewayConfig.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.name && { name: dto.name.toLowerCase() }),
      },
    });

    return {
      ...updated,
      credentials: maskCredentials(updated.credentials as Record<string, any>),
    };
  }

  async toggleActive(id: string, isActive: boolean) {
    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { id },
    });
    if (!config) throw new NotFoundException(`Gateway config "${id}" not found`);

    const updated = await this.prisma.paymentGatewayConfig.update({
      where: { id },
      data: { isActive },
    });

    return {
      ...updated,
      credentials: maskCredentials(updated.credentials as Record<string, any>),
    };
  }

  async remove(id: string) {
    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { id },
    });
    if (!config) throw new NotFoundException(`Gateway config "${id}" not found`);
    return this.prisma.paymentGatewayConfig.delete({ where: { id } });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private validateCredentials(
    name: string,
    credentials: Record<string, any>,
  ): void {
    const required: Record<string, string[]> = {
      sslcommerz: ['store_id', 'store_passwd'],
      bkash: ['app_key', 'app_secret', 'username', 'password'],
      amarpay: ['store_id', 'signature_key'],
    };

    const lowerName = name.toLowerCase();
    const requiredKeys = required[lowerName];

    if (!requiredKeys) return; // unknown gateway — skip schema validation

    const missing = requiredKeys.filter((k) => !(k in credentials));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required credentials for ${name}: ${missing.join(', ')}`,
      );
    }
  }
}
