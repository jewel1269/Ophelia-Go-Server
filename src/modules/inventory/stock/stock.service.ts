import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { StockMovementType } from '@prisma/client';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { BulkAdjustStockDto } from './dto/bulk-adjust-stock.dto';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Stock overview — all products with current stock state
  // ---------------------------------------------------------------------------

  async getStockOverview(params: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    lowStockThreshold?: number;
  }) {
    const { page, limit, search, categoryId, brandId, lowStockThreshold } = params;
    const skip = (page - 1) * limit;

    const where: any = { isArchived: false };
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (lowStockThreshold !== undefined) {
      where.stock = { lte: lowStockThreshold };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { stock: 'asc' },
        select: {
          id: true,
          name: true,
          sku: true,
          thumbnail: true,
          stock: true,
          price: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          variants: {
            select: { id: true, name: true, sku: true, stock: true },
          },
          _count: { select: { stockMovements: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const data = products.map((p) => ({
      ...p,
      totalVariantStock: p.variants.reduce((s, v) => s + v.stock, 0),
      isOutOfStock: p.stock === 0,
      isLowStock: lowStockThreshold !== undefined
        ? p.stock > 0 && p.stock <= lowStockThreshold
        : p.stock > 0 && p.stock <= 10,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ---------------------------------------------------------------------------
  // Single stock adjustment
  // ---------------------------------------------------------------------------

  async adjustStock(dto: AdjustStockDto, adminId: string) {
    if (dto.delta === 0) {
      throw new BadRequestException('delta cannot be 0');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: dto.variantId },
          select: { stock: true, productId: true },
        });
        if (!variant) throw new NotFoundException('Product variant not found');
        if (variant.productId !== dto.productId) {
          throw new BadRequestException('Variant does not belong to the specified product');
        }

        const stockAfter = variant.stock + dto.delta;
        if (stockAfter < 0) {
          throw new BadRequestException(
            `Stock would go negative (${variant.stock} + ${dto.delta} = ${stockAfter})`,
          );
        }

        await tx.productVariant.update({
          where: { id: dto.variantId },
          data: { stock: stockAfter },
        });

        return tx.stockMovement.create({
          data: {
            productId: dto.productId,
            variantId: dto.variantId,
            type: dto.type as unknown as StockMovementType,
            delta: dto.delta,
            stockBefore: variant.stock,
            stockAfter,
            reason: dto.reason,
            note: dto.note,
            locationId: dto.locationId,
            reference: dto.reference,
            performedById: adminId,
          },
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, name: true, sku: true } },
            location: { select: { id: true, name: true, code: true } },
          },
        });
      } else {
        const product = await tx.product.findUnique({
          where: { id: dto.productId },
          select: { stock: true },
        });
        if (!product) throw new NotFoundException('Product not found');

        const stockAfter = product.stock + dto.delta;
        if (stockAfter < 0) {
          throw new BadRequestException(
            `Stock would go negative (${product.stock} + ${dto.delta} = ${stockAfter})`,
          );
        }

        await tx.product.update({
          where: { id: dto.productId },
          data: { stock: stockAfter },
        });

        return tx.stockMovement.create({
          data: {
            productId: dto.productId,
            type: dto.type as unknown as StockMovementType,
            delta: dto.delta,
            stockBefore: product.stock,
            stockAfter,
            reason: dto.reason,
            note: dto.note,
            locationId: dto.locationId,
            reference: dto.reference,
            performedById: adminId,
          },
          include: {
            product: { select: { id: true, name: true, sku: true } },
            location: { select: { id: true, name: true, code: true } },
          },
        });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Bulk stock adjustment — all or nothing (transaction)
  // ---------------------------------------------------------------------------

  async bulkAdjust(dto: BulkAdjustStockDto, adminId: string) {
    const results = await this.prisma.$transaction(async (tx) => {
      const movements: any[] = [];

      for (const item of dto.items) {
        if (item.delta === 0) continue;

        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { stock: true, productId: true },
          });
          if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found`);
          if (variant.productId !== item.productId) {
            throw new BadRequestException(
              `Variant ${item.variantId} does not belong to product ${item.productId}`,
            );
          }

          const stockAfter = variant.stock + item.delta;
          if (stockAfter < 0) {
            throw new BadRequestException(
              `Variant ${item.variantId}: stock would go negative (${variant.stock} + ${item.delta})`,
            );
          }

          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: stockAfter },
          });

          const m = await tx.stockMovement.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              type: item.type as unknown as StockMovementType,
              delta: item.delta,
              stockBefore: variant.stock,
              stockAfter,
              reason: item.reason,
              note: dto.note ?? item.note,
              locationId: item.locationId,
              reference: item.reference,
              performedById: adminId,
            },
          });
          movements.push(m);
        } else {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true },
          });
          if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

          const stockAfter = product.stock + item.delta;
          if (stockAfter < 0) {
            throw new BadRequestException(
              `Product ${item.productId}: stock would go negative (${product.stock} + ${item.delta})`,
            );
          }

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: stockAfter },
          });

          const m = await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: item.type as unknown as StockMovementType,
              delta: item.delta,
              stockBefore: product.stock,
              stockAfter,
              reason: item.reason,
              note: dto.note ?? item.note,
              locationId: item.locationId,
              reference: item.reference,
              performedById: adminId,
            },
          });
          movements.push(m);
        }
      }

      return movements;
    });

    return { adjusted: results.length, movements: results };
  }

  // ---------------------------------------------------------------------------
  // Stock movements — audit log
  // ---------------------------------------------------------------------------

  async getMovements(params: {
    page: number;
    limit: number;
    type?: StockMovementType;
    productId?: string;
    from?: string;
    to?: string;
  }) {
    const { page, limit, type, productId, from, to } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (productId) where.productId = productId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true, thumbnail: true } },
          variant: { select: { id: true, name: true, sku: true } },
          location: { select: { id: true, name: true, code: true } },
          purchaseOrder: { select: { id: true, poNumber: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getProductMovements(productId: string, params: { page: number; limit: number }) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, stock: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variant: { select: { id: true, name: true, sku: true } },
          location: { select: { id: true, name: true, code: true } },
          purchaseOrder: { select: { id: true, poNumber: true } },
        },
      }),
      this.prisma.stockMovement.count({ where: { productId } }),
    ]);

    return {
      product,
      movements: {
        data: movements,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Low-stock & out-of-stock helpers
  // ---------------------------------------------------------------------------

  async getLowStock(params: { threshold: number; page: number; limit: number }) {
    const { threshold, page, limit } = params;
    const skip = (page - 1) * limit;

    const where = { stock: { gt: 0, lte: threshold }, isArchived: false };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { stock: 'asc' },
        select: {
          id: true,
          name: true,
          sku: true,
          thumbnail: true,
          stock: true,
          price: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      threshold,
      data: products,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOutOfStock(params: { page: number; limit: number }) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where = { stock: 0, isArchived: false };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          sku: true,
          thumbnail: true,
          price: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
